/**
 * DoGet Content Script — injects "加速下载" buttons on GitHub Release pages.
 *
 * GitHub loads asset lists dynamically, so MutationObserver is used to detect
 * new asset link elements as they appear in the DOM.
 */

const INJECTED_MARKER = "data-doget-injected";
const ASSET_HREF_PATTERN = /\/releases\/download\//;

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

function injectButton(linkEl) {
  linkEl.setAttribute(INJECTED_MARKER, "true");

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "doget-accelerate-btn";
  btn.textContent = "⚡ 加速下载";

  btn.addEventListener("click", async (e) => {
    e.preventDefault();
    e.stopPropagation();
    btn.disabled = true;
    btn.textContent = "⏳ ...";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "ACCELERATE_DOWNLOAD",
        url: linkEl.href,
      });

      if (response.success) {
        btn.textContent = "✅ 已开始";
        setTimeout(() => {
          btn.textContent = "⚡ 加速下载";
          btn.disabled = false;
        }, 2000);
      } else {
        btn.textContent = "❌ 失败";
        setTimeout(() => {
          btn.textContent = "⚡ 加速下载";
          btn.disabled = false;
        }, 2000);
      }
    } catch {
      btn.textContent = "❌ 失败";
      setTimeout(() => {
        btn.textContent = "⚡ 加速下载";
        btn.disabled = false;
      }, 2000);
    }
  });

  const wrapper = document.createElement("span");
  wrapper.className = "doget-btn-wrapper";
  wrapper.appendChild(btn);

  linkEl.parentNode.insertBefore(wrapper, linkEl.nextSibling);
}

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
