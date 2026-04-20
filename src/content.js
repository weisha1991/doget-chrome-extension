/**
 * DoGet Content Script — injects accelerate buttons on GitHub Release pages.
 *
 * GitHub loads asset lists dynamically, so MutationObserver is used to detect
 * new asset link elements as they appear in the DOM. A batch accelerate toolbar
 * is injected at the top of the page when assets are detected.
 */

const INJECTED_MARKER = "data-doget-injected";
const TOOLBAR_ID = "doget-batch-toolbar";
const ASSET_HREF_PATTERN = /\/releases\/download\//;

const collectedLinks = new Map();

function msg(key, substitutions) {
  return chrome.i18n.getMessage(key, substitutions);
}

function isAssetLink(el) {
  return (
    el.tagName === "A" &&
    ASSET_HREF_PATTERN.test(el.href) &&
    !el.hasAttribute(INJECTED_MARKER)
  );
}

// ---- Single link button injection ----

function injectButton(linkEl) {
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

function scanAndInject(root) {
  const links = root.querySelectorAll('a[href*="/releases/download/"]');
  for (const link of links) {
    if (!link.hasAttribute(INJECTED_MARKER)) {
      injectButton(link);
    }
  }
}

scanAndInject(document.body);

const observer = new MutationObserver((mutations) => {
  for (const mutation of mutations) {
    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        if (node.tagName === "A" && isAssetLink(node)) {
          injectButton(node);
        }
        scanAndInject(node);
      }
    }
  }
});

observer.observe(document.body, { childList: true, subtree: true });
