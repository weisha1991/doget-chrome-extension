# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

DoGet Download Accelerator is a Chrome Extension (Manifest V3) that accelerates file downloads via the DoGet API. It provides two acceleration methods:

1. **Right-click context menu** — Right-click any download link to accelerate it
2. **Popup manual input** — Click the extension icon to paste and accelerate URLs
3. **GitHub Release injection** — Automatically injects "⚡ 加速下载" buttons on GitHub Release pages with batch acceleration support

## Development Commands

```bash
# Lint JavaScript code
npm run lint

# Format all code (JS, HTML, CSS, JSON, MD)
npm run format

# Check formatting without modifying files
npm run format:check

# Build extension package for Chrome Web Store
npm run build
```

The build script (`scripts/build.js`) copies all necessary files to `dist/doget-extension/` for distribution.

## Architecture

### Core Components

**Service Worker (`src/background.js`)**
- Registers context menu on all links
- Handles API communication with DoGet service
- Orchestrates the acceleration flow: `original URL → get token → download with token`
- Listens for messages from popup and content scripts

**Popup UI (`src/popup.html`, `src/popup.js`, `src/popup.css`)**
- Manual URL input interface
- Sends acceleration requests to background service worker
- Dark theme UI

**Content Script (`src/content.js`, `src/content.css`)**
- Injected only on GitHub Release pages (see `manifest.json` content_scripts)
- Uses `MutationObserver` to detect dynamically loaded asset links
- Injects individual "⚡ 加速下载" buttons next to each release asset
- Provides batch acceleration toolbar at the top of the page
- Maintains a `Map` of collected links for batch operations

### API Flow

```
1. User triggers download (context menu / popup / content script button)
2. Background worker calls: GET /api/get_download_token?url={original_url}
3. API returns: { data: "<token>" } or { token: "<token>" }
4. Background worker triggers: chrome.downloads.download() with /api/download?token={token}
```

API base URL: `https://doget-api.oopscloud.xyz`

### Internationalization

- Uses Chrome i18n API (`chrome.i18n.getMessage()`)
- Message bundles in `_locales/zh_CN/` and `_locales/en/`
- Default locale: `zh_CN` (set in `manifest.json`)

## Key Implementation Details

### Content Script Injection Strategy

The content script uses `MutationObserver` because GitHub loads release assets dynamically via JavaScript. The observer watches for new `<a>` elements matching `/releases/download/` and injects buttons as they appear.

Each injected link is marked with `data-doget-injected="true"` to prevent duplicate button injection.

### Batch Acceleration

The batch toolbar (`#doget-batch-toolbar`) is injected at the top of GitHub Release pages when assets are detected. It:
- Shows asset count
- Provides "⚡ 一键加速全部" button
- Processes downloads sequentially with 800ms delay between requests
- Updates progress in real-time

### Token Extraction

The `extractToken()` function handles two API response shapes:
- `{ data: "token" }` (current API format)
- `{ token: "token" }` (fallback format)

This provides resilience against API changes.

## Testing the Extension

1. Load unpacked extension in Chrome:
   - Navigate to `chrome://extensions/`
   - Enable Developer mode
   - Click "Load unpacked"
   - Select the project root directory

2. Test context menu:
   - Right-click any download link
   - Select "DoGet 加速下载此链接"

3. Test popup:
   - Click extension icon
   - Paste a download URL
   - Click "加速下载"

4. Test GitHub injection:
   - Visit any GitHub Release page (e.g., `https://github.com/*/releases`)
   - Verify buttons appear next to assets
   - Test batch acceleration toolbar

## File Structure Notes

- **No build step for source code** — The extension runs directly from source files
- **`npm run build`** only packages files into `dist/` for distribution
- **No bundler** — Uses vanilla JavaScript (no webpack/rollup)
- **No tests** — Manual testing only (no test framework configured)

## Permissions

- `contextMenus` — Required for right-click menu
- `downloads` — Required to trigger Chrome downloads
- `host_permissions` — Only requests access to DoGet API domain

Minimal permissions by design for user privacy.
