/**
 * DoGet Download Accelerator - Background Service Worker
 *
 * Registers a context menu on links. On click, calls the DoGet API to obtain
 * an accelerated download URL, then triggers a Chrome download.
 */

const API_BASE = "https://doget-api.oopscloud.xyz";
const GET_TOKEN_PATH = "/api/get_download_token";
const DOWNLOAD_PATH = "/api/download";

function msg(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions);
}

// Context menu registration

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "doget-accelerate",
    title: msg("contextMenuTitle"),
    contexts: ["link"],
  });
});

// Context menu click handler

chrome.contextMenus.onClicked.addListener(async (info, _tab) => {
  if (info.menuItemId !== "doget-accelerate") return;
  const originalUrl = info.linkUrl;
  if (!originalUrl) return;

  try {
    await accelerateAndDownload(originalUrl);
  } catch (err) {
    showNotification(err.message);
  }
});

// Message handler (called from popup)

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "ACCELERATE_DOWNLOAD") {
    const { url } = message;
    accelerateAndDownload(url)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true;
  }
});

// Core logic

async function accelerateAndDownload(originalUrl) {
  const tokenUrl = `${API_BASE}${GET_TOKEN_PATH}?url=${encodeURIComponent(originalUrl)}`;

  const resp = await fetch(tokenUrl, {
    method: "GET",
    headers: { Accept: "application/json, text/plain, */*" },
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(text || `HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const token = extractToken(data);

  if (!token) {
    throw new Error(msg("notifyApiNoToken"));
  }

  const acceleratedUrl = `${API_BASE}${DOWNLOAD_PATH}?token=${encodeURIComponent(token)}`;
  const filename = extractFilename(originalUrl);

  await chrome.downloads.download({
    url: acceleratedUrl,
    filename: filename || undefined,
    saveAs: true,
  });
}

/**
 * Extract the token field from the API response.
 * Handles both { data: "token" } and { token: "token" } response shapes.
 */
function extractToken(obj) {
  if (!obj || typeof obj !== "object") return "";
  if (typeof obj.data === "string") return obj.data;
  if (typeof obj.token === "string") return obj.token;
  return "";
}

function extractFilename(url) {
  try {
    const pathname = new URL(url).pathname;
    const segments = pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] || "";
    if (last.includes(".")) return last;
  } catch {}
  return "";
}

function showNotification(errorMessage) {
  chrome.notifications?.create?.({
    type: "basic",
    iconUrl: "icons/icon128.png",
    title: msg("notifyFailedTitle"),
    message: msg("notifyFailedMessage", [errorMessage]),
  });
}
