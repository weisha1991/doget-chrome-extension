/**
 * DoGet Content Script — injects accelerate buttons on download links.
 *
 * Supports GitHub Release pages and generic download sites.
 * Uses MutationObserver to detect dynamically loaded links.
 */

const INJECTED_MARKER = "data-doget-injected";
const TOOLBAR_ID = "doget-batch-toolbar";
const ASSET_HREF_PATTERN = /\/releases\/download\//;
const LINK_COUNT_LIMIT = 100;

const collectedLinks = new Map();

function msg(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions);
}

// ---- Performance optimization layer ----

/**
 * Debounce utility function
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(fn, delay) {
  let timeoutId = null;
  return function (...args) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * Check if link count limit is reached
 * @returns {boolean} True if limit reached
 */
function isLinkLimitReached() {
  return collectedLinks.size >= LINK_COUNT_LIMIT;
}

// ---- LinkDetector: Universal download link recognition ----

/**
 * Strategy A: Match file extensions
 */
function matchFileExtension(href) {
  const extensions = [
    ".zip", ".tar.gz", ".7z", ".rar", ".bz2", ".xz",
    ".exe", ".dmg", ".deb", ".rpm", ".apk", ".msi",
    ".pkg", ".AppImage", ".flatpak", ".snap",
    ".tar", ".tgz", ".iso", ".img", ".bin"
  ];

  const lowerHref = href.toLowerCase();
  return extensions.some(ext => lowerHref.endsWith(ext));
}

/**
 * Strategy B: Match URL patterns
 */
function matchUrlPattern(href) {
  const lowerHref = href.toLowerCase();

  // Path patterns
  const pathPatterns = [
    "/download/", "/releases/", "/dist/", "/files/", "/attachments/"
  ];
  if (pathPatterns.some(pattern => lowerHref.includes(pattern))) {
    return true;
  }

  // Domain patterns
  try {
    const url = new URL(href);
    const hostname = url.hostname.toLowerCase();
    const domainPatterns = ["cdn.", "dl.", "download.", "files.", "releases."];
    if (domainPatterns.some(pattern => hostname.startsWith(pattern))) {
      return true;
    }
  } catch {
    // Invalid URL, skip domain check
  }

  // Query parameter patterns
  const queryPatterns = ["?download=", "?file=", "?attachment="];
  if (queryPatterns.some(pattern => lowerHref.includes(pattern))) {
    return true;
  }

  return false;
}

/**
 * Strategy C: Check download attribute
 */
function matchDownloadAttribute(el) {
  return el.hasAttribute("download");
}

/**
 * Main entry: Determine if element is a download link
 * Combines 3 strategies: A OR B → high confidence; only C → medium confidence
 */
function isDownloadLink(el) {
  if (el.tagName !== "A" || !el.href) {
    return false;
  }

  if (el.hasAttribute(INJECTED_MARKER)) {
    return false;
  }

  const strategyA = matchFileExtension(el.href);
  const strategyB = matchUrlPattern(el.href);
  const strategyC = matchDownloadAttribute(el);

  // High confidence: A OR B
  if (strategyA || strategyB) {
    return true;
  }

  // Medium confidence: only C
  if (strategyC) {
    return true;
  }

  return false;
}

/**
 * GitHub Release specific check (preserves existing behavior)
 */
function isAssetLink(el) {
  return (
    el.tagName === "A" &&
    ASSET_HREF_PATTERN.test(el.href) &&
    !el.hasAttribute(INJECTED_MARKER)
  );
}

// ---- Single link button injection ----

/**
 * Check if injecting button would cause layout conflict
 * @param {HTMLElement} linkEl - The link element
 * @returns {boolean} True if conflict detected
 */
function checkLayoutConflict(linkEl) {
  // Check 1: Parent element exists
  if (!linkEl.parentNode) {
    return true;
  }

  // Check 2: Check if there's already a button tightly adjacent (margin < 4px)
  // Skip text nodes and find the next element sibling
  let nextElement = linkEl.nextSibling;
  while (nextElement && nextElement.nodeType !== Node.ELEMENT_NODE) {
    nextElement = nextElement.nextSibling;
  }

  if (nextElement) {
    // Check if it's a button or button-like element
    const tagName = nextElement.tagName.toLowerCase();
    const isButtonLike = tagName === "button" || tagName === "a" || nextElement.classList.contains("btn");

    if (isButtonLike) {
      // Check spacing between link and button
      const linkRect = linkEl.getBoundingClientRect();
      const nextRect = nextElement.getBoundingClientRect();
      const gap = nextRect.left - linkRect.right;

      // If gap is less than 8px, consider it a conflict
      if (gap < 8) {
        return true;
      }
    }
  }

  // Check 3: Check if button would overflow parent container
  try {
    const parentRect = linkEl.parentNode.getBoundingClientRect();
    const linkRect = linkEl.getBoundingClientRect();

    // Estimate button width (approximately 100px based on CSS)
    const estimatedButtonWidth = 100;
    const buttonRightEdge = linkRect.right + 8 + estimatedButtonWidth; // 8px margin-left

    // Check if button would overflow parent's right edge
    if (buttonRightEdge > parentRect.right) {
      return true;
    }
  } catch (e) {
    // If getBoundingClientRect fails, assume conflict to be safe
    return true;
  }

  return false;
}

function injectButton(linkEl) {
  // Check link count limit
  if (isLinkLimitReached()) {
    return;
  }

  // Check layout conflict
  if (checkLayoutConflict(linkEl)) {
    // Auto-degrade: skip injection, right-click menu still available
    linkEl.setAttribute(INJECTED_MARKER, "true");
    return;
  }

  linkEl.setAttribute(INJECTED_MARKER, "true");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "doget-accelerate-btn";
  btn.textContent = "⚡ 加速下载";

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    await handleAccelerate(btn, linkEl.href);
  });

  const wrapper = document.createElement("span");
  wrapper.className = "doget-btn-wrapper";
  wrapper.appendChild(btn);
  linkEl.parentNode.insertBefore(wrapper, linkEl.nextSibling);

  collectedLinks.set(linkEl.href, btn);
  updateToolbar();
}

// ---- Scene detection and routing ----

/**
 * Detect current page scene
 * @returns {string} "github-release" or "generic"
 */
function detectScene() {
  const url = window.location.href;
  if (/github\.com\/.*\/releases/.test(url)) {
    return "github-release";
  }
  return "generic";
}

async function handleAccelerate(btn, url) {
  btn.disabled = true;
  btn.textContent = "⏳ ...";
  try {
    const response = await chrome.runtime.sendMessage({
      type: "ACCELERATE_DOWNLOAD",
      url,
    });
    btn.textContent = response.success ? "✅ 已开始" : "❌ 失败";
  } catch {
    btn.textContent = "❌ 失败";
  }
  setTimeout(() => {
    btn.textContent = "⚡ 加速下载";
    btn.disabled = false;
  }, 2000);
}

// ---- Batch toolbar ----

function ensureToolbar() {
  let toolbar = document.getElementById(TOOLBAR_ID);
  if (toolbar) return toolbar;

  toolbar = document.createElement("div");
  toolbar.id = TOOLBAR_ID;

  const inner = document.createElement("div");
  inner.className = "doget-toolbar-inner";

  const label = document.createElement("span");
  label.className = "doget-toolbar-label";
  label.textContent = "DoGet 加速下载";

  const batchBtn = document.createElement("button");
  batchBtn.type = "button";
  batchBtn.id = "doget-batch-btn";
  batchBtn.className = "doget-batch-btn";
  batchBtn.textContent = "⚡ 一键加速全部";
  batchBtn.addEventListener("click", handleBatchAccelerate);

  const countSpan = document.createElement("span");
  countSpan.id = "doget-asset-count";
  countSpan.className = "doget-asset-count";

  const progress = document.createElement("span");
  progress.id = "doget-batch-progress";
  progress.className = "doget-batch-progress";
  progress.hidden = true;

  inner.appendChild(label);
  inner.appendChild(batchBtn);
  inner.appendChild(countSpan);
  inner.appendChild(progress);
  toolbar.appendChild(inner);

  const releaseHeader =
    document.querySelector(".release") ||
    document.querySelector('[data-testid="release-header"]') ||
    document.querySelector(".repository-content");

  if (releaseHeader) {
    releaseHeader.parentNode.insertBefore(toolbar, releaseHeader);
  } else {
    document.body.prepend(toolbar);
  }

  return toolbar;
}

function updateToolbar() {
  // Only show batch toolbar in GitHub Release scene
  if (currentScene !== "github-release") {
    return;
  }

  if (collectedLinks.size === 0) return;
  const toolbar = ensureToolbar();
  const countEl = toolbar.querySelector("#doget-asset-count");
  if (countEl) {
    countEl.textContent = `检测到 ${collectedLinks.size} 个资源`;
  }
}

async function handleBatchAccelerate() {
  const btn = document.getElementById("doget-batch-btn");
  const progressEl = document.getElementById("doget-batch-progress");
  if (!btn || collectedLinks.size === 0) return;

  btn.disabled = true;
  btn.textContent = "⏳ 加速中...";
  progressEl.hidden = false;

  const urls = [...collectedLinks.keys()];
  let success = 0;
  let failed = 0;

  for (let i = 0; i < urls.length; i++) {
    progressEl.textContent = `${i + 1}/${urls.length}`;
    const singleBtn = collectedLinks.get(urls[i]);

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ACCELERATE_DOWNLOAD",
        url: urls[i],
      });
      if (response.success) {
        success++;
        if (singleBtn) singleBtn.textContent = "✅";
      } else {
        failed++;
        if (singleBtn) singleBtn.textContent = "❌";
      }
    } catch {
      failed++;
      if (singleBtn) singleBtn.textContent = "❌";
    }

    if (i < urls.length - 1) {
      await sleep(800);
    }
  }

  btn.textContent = `✅ 完成 (${success}/${urls.length})`;
  progressEl.textContent = failed > 0 ? `${failed} 个失败` : "全部成功";

  setTimeout(() => {
    btn.textContent = "⚡ 一键加速全部";
    btn.disabled = false;
    progressEl.hidden = true;
    for (const b of collectedLinks.values()) {
      b.textContent = "⚡ 加速下载";
      b.disabled = false;
    }
  }, 3000);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---- DOM scanning ----

const currentScene = detectScene();
console.log('[DoGet] Scene detected:', currentScene);

function scanAndInject(root) {
  const links = root.querySelectorAll('a[href]');
  console.log('[DoGet] Scanning', links.length, 'links');

  for (const link of links) {
    if (link.hasAttribute(INJECTED_MARKER)) {
      continue;
    }

    // Scene-based link detection
    let shouldInject = false;
    if (currentScene === "github-release") {
      // GitHub Release: use isAssetLink for backward compatibility
      shouldInject = isAssetLink(link);
    } else {
      // Generic: use isDownloadLink for universal detection
      shouldInject = isDownloadLink(link);
    }

    if (shouldInject) {
      console.log('[DoGet] Injecting button for:', link.href);
      injectButton(link);
    }
  }
}

scanAndInject(document.body);
console.log('[DoGet] Initial scan complete');

// Debounced scan function for MutationObserver
const debouncedScan = debounce((node) => {
  if (node.tagName === "A") {
    let shouldInject = false;
    if (currentScene === "github-release") {
      shouldInject = isAssetLink(node);
    } else {
      shouldInject = isDownloadLink(node);
    }

    if (shouldInject) {
      injectButton(node);
    }
  }
  scanAndInject(node);
}, 300);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        debouncedScan(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
