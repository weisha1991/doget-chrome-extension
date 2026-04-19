const form = document.getElementById("download-form");
const urlInput = document.getElementById("url-input");
const submitBtn = document.getElementById("submit-btn");
const statusEl = document.getElementById("status");

function i18n(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions);
}

function showStatus(msg, type) {
  statusEl.textContent = msg;
  statusEl.className = `status ${type}`;
  statusEl.hidden = false;
}

function applyLocale() {
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    el.textContent = i18n(key);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const key = el.getAttribute("data-i18n-placeholder");
    el.placeholder = i18n(key);
  });
}

function isValidUrl(str) {
  try {
    const url = new URL(str);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

applyLocale();

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = urlInput.value.trim();
  if (!url) return;

  if (!isValidUrl(url)) {
    showStatus(i18n("popupFailed"), "err");
    return;
  }

  submitBtn.disabled = true;
  showStatus(i18n("popupFetching"), "info");

  try {
    const response = await chrome.runtime.sendMessage({
      type: "ACCELERATE_DOWNLOAD",
      url,
    });

    if (response.success) {
      showStatus(i18n("popupSuccess"), "ok");
    } else {
      showStatus(response.error || i18n("popupFailed"), "err");
    }
  } catch (err) {
    showStatus(err.message || i18n("popupCommError"), "err");
  } finally {
    submitBtn.disabled = false;
  }
});
