# REQUIREMENT: 通用资源加速支持

- **Change ID**: `universal-resource-acceleration`
- **关联**: `@.specs/universal-resource-acceleration/CHANGE.md`、`@.specs/CONTEXT.md`

---

## 用户故事

### US-1: 通用网站自动注入加速按钮

**作为** 经常下载开源软件、工具、依赖包的用户，
**我想** 在任何下载站（不仅限于 GitHub Release）都能看到自动注入的"⚡ 加速下载"按钮，
**以便** 无需右键菜单或手动复制 URL，直接点击按钮即可加速下载。

### US-2: 智能识别下载链接

**作为** 访问各类网站的用户，
**我想** 扩展能智能识别哪些链接是下载链接（而非普通导航链接），
**以便** 只在真正的下载链接旁边看到加速按钮，不会被误注入的按钮干扰。

### US-3: 性能优化与布局兼容

**作为** 访问包含大量链接的网站的用户，
**我想** 扩展的注入过程不会导致页面卡顿或布局错乱，
**以便** 保持流畅的浏览体验。

### US-4: 错误处理与降级

**作为** 遇到加速失败或识别错误的用户，
**我想** 看到明确的状态反馈，并能通过右键菜单或 Popup 手动触发加速，
**以便** 在自动注入失败时仍能完成下载加速。

---

## 验收准则（AC）

### AC-1 · 常见下载站识别准确率

- **Given** 用户访问 SourceForge、GitLab Releases、npm、PyPI、软件官网等常见下载站
- **When** 页面加载完成
- **Then** 扩展正确识别 ≥ 90% 的下载链接，并在每个链接旁边注入"⚡ 加速下载"按钮
- **验证方式**: 手动 UAT — 访问 20 个典型下载站（见测试用例清单），统计识别准确率

### AC-2 · 文件扩展名识别

- **Given** 页面包含指向 `.zip`、`.tar.gz`、`.exe`、`.dmg`、`.deb`、`.rpm`、`.apk`、`.iso` 等文件的链接
- **When** 页面加载完成
- **Then** 所有这些链接旁边都注入加速按钮
- **验证方式**: 手动 UAT — 创建测试页面，包含 15 种常见文件扩展名的链接，验证全部注入

### AC-3 · URL 特征识别

- **Given** 页面包含 URL 路径含 `/download/`、`/releases/`、`/dist/`、`/files/` 或域名含 `cdn.`、`dl.`、`download.` 的链接
- **When** 页面加载完成
- **Then** 这些链接旁边注入加速按钮（即使没有文件扩展名）
- **验证方式**: 手动 UAT — 创建测试页面，包含 10 种 URL 特征模式，验证全部注入

### AC-4 · HTML download 属性识别

- **Given** 页面包含 `<a href="..." download>` 或 `<a href="..." download="filename.ext">` 的链接
- **When** 页面加载完成
- **Then** 这些链接旁边注入加速按钮
- **验证方式**: 手动 UAT — 创建测试页面，包含 5 个带 download 属性的链接，验证全部注入

### AC-5 · 误检率控制

- **Given** 页面包含普通导航链接（如 `/about`、`/docs`、`/blog/post-title`）
- **When** 页面加载完成
- **Then** 这些链接旁边**不**注入加速按钮，误检率 < 5%
- **验证方式**: 手动 UAT — 访问 10 个内容型网站（博客、文档站），统计误注入数量

### AC-6 · 性能 - 注入延迟

- **Given** 页面包含 50-100 个下载链接
- **When** 页面加载完成
- **Then** 从 DOMContentLoaded 到所有按钮注入完成的时间 ≤ 500ms
- **验证方式**: `console.time()` 测量 — 在测试页面中记录注入耗时

### AC-7 · 性能 - 链接数量上限

- **Given** 页面包含 > 100 个下载链接
- **When** 页面加载完成
- **Then** 只处理前 100 个链接，其余链接不注入按钮（但右键菜单仍可用）
- **验证方式**: 手动 UAT — 创建包含 150 个下载链接的测试页面，验证只注入 100 个按钮

### AC-8 · 性能 - 防抖/节流

- **Given** 页面通过 JavaScript 动态加载下载链接（如无限滚动）
- **When** 新链接出现在 DOM 中
- **Then** MutationObserver 触发后延迟 300ms 再批量处理，避免频繁重绘
- **验证方式**: Chrome DevTools Performance 分析 — 验证 MutationObserver 回调触发频率

### AC-9 · 布局兼容 - 自动降级

- **Given** 页面的下载链接周围空间不足（如已有其他按钮紧贴）
- **When** 扩展尝试注入按钮
- **Then** 检测到布局冲突后自动降级，不注入可见按钮，仅保留右键菜单功能
- **验证方式**: 手动 UAT — 创建紧凑布局的测试页面，验证不会遮挡原有元素

### AC-10 · 按钮点击 - 加速成功

- **Given** 用户点击注入的"⚡ 加速下载"按钮
- **When** DoGet API 返回成功
- **Then** 按钮状态变为"⏳ ..."，然后变为"✅ 已开始"，2 秒后恢复为"⚡ 加速下载"，Chrome 下载管理器显示下载任务
- **验证方式**: 手动 UAT — 点击按钮，观察状态变化和下载任务

### AC-11 · 按钮点击 - 加速失败

- **Given** 用户点击注入的"⚡ 加速下载"按钮
- **When** DoGet API 返回失败或网络错误
- **Then** 按钮状态变为"❌ 失败"，2 秒后恢复为"⚡ 加速下载"
- **验证方式**: 手动 UAT — 模拟 API 失败（断网或修改 API URL），验证错误反馈

### AC-12 · 右键菜单兜底

- **Given** 页面包含下载链接，但扩展未注入按钮（如超过 100 个链接上限，或布局冲突降级）
- **When** 用户右键点击该链接，选择"DoGet 加速下载此链接"
- **Then** 触发加速下载，功能正常
- **验证方式**: 手动 UAT — 在超过上限的链接上右键测试

### AC-13 · Popup 手动输入兜底

- **Given** 用户复制了一个下载链接 URL
- **When** 用户打开扩展 Popup，粘贴 URL，点击"加速下载"
- **Then** 触发加速下载，功能正常（与现有功能保持一致）
- **验证方式**: 手动 UAT — 复制任意下载链接，通过 Popup 加速

### AC-14 · GitHub Release 特殊场景保留

- **Given** 用户访问 GitHub Release 页面
- **When** 页面加载完成
- **Then** 除了每个资源链接旁边的单个按钮，页面顶部仍显示"⚡ 一键加速全部"批量工具栏
- **验证方式**: 手动 UAT — 访问任意 GitHub Release 页面，验证批量工具栏存在

### AC-15 · manifest.json 权限更新

- **Given** 扩展需要在所有网站注入 content script
- **When** 用户安装或更新扩展
- **Then** `manifest.json` 的 `content_scripts.matches` 包含 `<all_urls>` 或 `["http://*/*", "https://*/*"]`，`host_permissions` 保持不变
- **验证方式**: `cat manifest.json | grep -A 5 content_scripts` — 验证 matches 字段

---

## 范围切分

### v1（本次必做）

- ✅ 实现组合识别策略（文件扩展名 + URL 特征 + download 属性）
- ✅ 在所有网站注入单个加速按钮（复用 GitHub Release 的 UI 样式）
- ✅ 性能优化：链接数量上限（100）、防抖/节流（300ms）、增量注入
- ✅ 布局冲突检测与自动降级
- ✅ 错误处理：加速失败状态反馈
- ✅ 保留 GitHub Release 的批量工具栏
- ✅ 更新 `manifest.json` 的 `content_scripts.matches`
- ✅ 在 20 个典型下载站测试识别准确率

### v2（下一轮考虑，本次不做）

- 🔄 支持用户自定义"排除网站"列表（某些网站不自动注入）
- 🔄 在 Popup 中显示"识别统计"功能（当前页面检测到的链接数）
- 🔄 支持用户自定义识别规则（添加文件扩展名或 URL 模式）
- 🔄 提供"调试模式"，高亮显示所有检测到的下载链接
- 🔄 在 Popup 中显示加速失败日志（供用户排查）
- 🔄 支持更多文件类型（如 `.whl`、`.gem`、`.nupkg` 等语言特定包格式）

### out（永远不做）

- ❌ 支持需要登录才能下载的资源（如网盘、付费内容）— 涉及 Cookie/Session 处理，复杂度高且涉及隐私
- ❌ 处理动态生成的 `blob:` 或 `data:` URL — DoGet API 无法加速临时 URL
- ❌ 下载管理器功能（断点续传、多线程下载、下载队列）— 超出"加速代理"核心定位
- ❌ Firefox 浏览器支持 — Manifest V3 在 Firefox 上支持不完善
- ❌ 使用 HEAD 请求检测 MIME 类型 — 增加网络开销，且可能被服务器拒绝

---

## 非功能性需求

### 性能

- **注入延迟**: 从 DOMContentLoaded 到所有按钮注入完成 ≤ 500ms（50-100 个链接的页面）
- **内存占用**: 每页增加 ≤ 2MB（存储检测到的链接 Map）
- **CPU 占用**: MutationObserver + 链接扫描增加 ≤ 10% CPU 占用
- **链接数量上限**: 每页最多处理 100 个链接

### 可访问性

- **键盘导航**: 注入的按钮支持 Tab 键聚焦和 Enter 键触发
- **屏幕阅读器**: 按钮包含 `aria-label="加速下载此链接"`
- **对比度**: 按钮文字与背景对比度 ≥ 4.5:1（WCAG AA 标准）

### 安全

- **权限最小化**: 虽然需要 `<all_urls>` 访问权限，但代码中不收集用户数据，不发送额外网络请求（除 DoGet API）
- **XSS 防护**: 注入的按钮使用 `textContent` 而非 `innerHTML`，避免 XSS 风险
- **CSP 兼容**: 不使用 `eval()` 或内联脚本

### 兼容性

- **浏览器**: Chrome ≥ 88（Manifest V3 最低版本）、Edge ≥ 88
- **操作系统**: Windows、macOS、Linux（Chrome 支持的所有平台）
- **网站兼容**: 在 SPA（React、Vue、Angular）和传统多页应用中都能正常工作

### 可观测性

- **控制台日志**: 开发模式下输出识别到的链接数量、注入耗时、降级原因
- **错误上报**: 无（本次不做远程错误收集）

---

## 依赖与假设

### 依赖

- **DoGet API**: `https://doget-api.oopscloud.xyz`
  - `/api/get_download_token?url={url}` — 获取加速 token
  - `/api/download?token={token}` — 加速下载
  - 假设 API 可用性 ≥ 99%，响应时间 ≤ 2s

- **Chrome Extension API**:
  - `chrome.runtime.sendMessage()` — content script 与 background 通信
  - `chrome.downloads.download()` — 触发下载
  - `chrome.i18n.getMessage()` — 国际化

- **现有代码**:
  - `src/background.js` — 加速逻辑保持不变
  - `src/content.css` — 复用按钮样式

### 假设

- **用户已授权权限**: 用户在安装或更新扩展时同意 `<all_urls>` 权限
- **网站 DOM 结构**: 下载链接是标准的 `<a href="...">` 元素（不处理 `<button onclick="download()">` 等非标准形式）
- **网络环境**: 用户可以访问 DoGet API（不在防火墙或代理后）
- **浏览器版本**: 用户使用 Chrome ≥ 88 或 Edge ≥ 88

---

## 测试用例清单（20 个典型下载站）

用于 AC-1 验证：

1. **开源软件**: SourceForge、FossHub、FileHippo
2. **代码托管**: GitLab Releases、Gitea Releases、Bitbucket Downloads
3. **包管理器**: npm、PyPI、RubyGems、Maven Central
4. **软件官网**: VLC、Firefox、LibreOffice、GIMP
5. **镜像站**: 清华大学开源镜像、阿里云镜像、华为云镜像
6. **文档站**: Read the Docs（PDF 下载）、GitHub Gist（Raw 文件）
7. **其他**: Archive.org、Internet Archive、Zenodo

---

> AC 是 TEST 阶段派生用例的唯一来源，禁止在 TEST 阶段引入新 AC。
