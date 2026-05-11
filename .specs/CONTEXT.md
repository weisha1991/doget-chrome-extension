# CONTEXT.md

本文档为 AI 提供项目上下文，包括架构、术语、已锁决策和默认行为。

---

## 项目概览

**DoGet Download Accelerator** 是一个 Chrome Extension (Manifest V3)，通过 DoGet API 加速文件下载。

**核心功能**：
1. 右键菜单加速任意链接
2. Popup 手动输入 URL 加速
3. 自动注入加速按钮（GitHub Release + 通用网站）

**技术栈**：
- Vanilla JavaScript（无构建工具、无打包器）
- Chrome Extension Manifest V3
- DoGet API (`https://doget-api.oopscloud.xyz`)

---

## 术语表

### 加速流程相关

- **加速 token**: DoGet API 返回的临时令牌，用于生成加速下载 URL
- **加速 URL**: 格式为 `/api/download?token={token}` 的 DoGet 代理 URL
- **原始 URL**: 用户想要下载的文件的原始链接

### 注入机制相关

- **通用注入**: 在所有网站上智能检测下载链接并自动注入加速按钮的机制（区别于 GitHub Release 特定注入）
- **注入标记**: `data-doget-injected="true"` 属性，用于防止重复注入
- **批量工具栏**: GitHub Release 页面顶部的"⚡ 一键加速全部"工具栏（仅 GitHub Release 特有）
- **单个按钮**: 注入在每个下载链接旁边的独立"⚡ 加速下载"按钮（通用注入和 GitHub Release 都有）

### 识别策略相关

- **高置信度下载链接**: 命中文件扩展名策略**或** URL 特征策略的链接
- **中置信度下载链接**: 仅命中 HTML download 属性策略的链接
- **布局冲突**: 注入按钮会遮挡原有页面元素的情况
- **自动降级**: 检测到布局冲突或其他问题时，不注入可见按钮，仅保留右键菜单功能

### 性能相关

- **链接数量上限**: 每页最多处理 100 个下载链接（超出部分不注入按钮）
- **防抖延迟**: MutationObserver 触发后延迟 300ms 再批量处理新增链接
- **增量注入**: 只处理新增的 DOM 节点，避免重复扫描已处理的链接

---

## 已锁决策

### 架构决策

1. **无构建工具**: 使用 Vanilla JavaScript，不引入 webpack/rollup/vite 等打包工具
   - 理由：保持项目简单，减少依赖，便于快速迭代
   - 影响：所有代码直接在浏览器中运行，不支持 TypeScript/JSX

2. **Manifest V3**: 使用最新的 Chrome Extension 平台
   - 理由：Manifest V2 将于 2024 年停止支持
   - 影响：使用 Service Worker 而非 Background Page

3. **最小权限原则**: 只请求必要的权限
   - 当前权限：`contextMenus`、`downloads`、`host_permissions: ["https://doget-api.oopscloud.xyz/*"]`
   - 新增权限（universal-resource-acceleration）：`content_scripts.matches: ["<all_urls>"]`
   - 不请求：`tabs`、`webRequest`、`storage`（暂未使用）

### 功能决策

4. **智能检测而非白名单**: 通用注入使用智能检测，不预先声明网站白名单
   - 理由：白名单维护成本高，无法覆盖长尾网站
   - 影响：需要组合多种识别策略，控制误检率

5. **准确率优先**: 宁可漏检也不误检
   - 理由：误注入按钮会破坏用户体验，漏检可通过右键菜单兜底
   - 影响：识别策略偏保守，目标误检率 < 5%

6. **布局冲突自动降级**: 检测到注入按钮会破坏页面布局时，自动降级为仅右键菜单
   - 理由：保持页面原样比强制注入更重要
   - 影响：某些网站可能看不到注入按钮，但功能仍可用

7. **GitHub Release 特殊处理**: 保留批量工具栏，不与通用注入合并
   - 理由：批量加速是 GitHub Release 的核心价值，用户已习惯
   - 影响：GitHub Release 页面同时有单个按钮和批量工具栏

### 性能决策

8. **链接数量上限 100**: 每页最多处理 100 个下载链接
   - 理由：避免在包含大量链接的页面上卡顿
   - 影响：超出部分不注入按钮，但右键菜单仍可用

9. **防抖延迟 300ms**: MutationObserver 触发后延迟 300ms 再批量处理
   - 理由：避免频繁 DOM 操作导致重绘
   - 影响：动态加载的链接会有 300ms 延迟才显示按钮

### 范围决策

10. **不支持登录资源**: 不处理需要登录才能下载的资源（如网盘、付费内容）
    - 理由：涉及 Cookie/Session 处理，复杂度高且涉及隐私
    - 影响：用户需要先登录下载，再通过 Popup 手动加速

11. **不支持动态 URL**: 不处理 `blob:` 或 `data:` URL
    - 理由：DoGet API 无法加速临时 URL
    - 影响：某些网站通过 JS 生成的下载链接无法加速

---

## 默认行为（AI 可信默认值）

### 代码风格

- **缩进**: 2 空格
- **引号**: 双引号
- **分号**: 必须加分号
- **命名**: camelCase（变量/函数）、UPPER_CASE（常量）、kebab-case（文件名/CSS 类名）
- **注释**: 只在非显而易见的逻辑处添加注释，避免冗余注释

### 文件组织

- **源码**: `src/` 目录
- **图标**: `icons/` 目录（16/48/128px）
- **国际化**: `_locales/zh_CN/` 和 `_locales/en/`
- **构建产物**: `dist/doget-extension/`（由 `npm run build` 生成）

### API 调用

- **超时**: 所有 fetch 请求默认 10s 超时
- **重试**: 不自动重试，失败时显示错误状态
- **错误处理**: 使用 try-catch 包裹所有异步操作

### UI 交互

- **按钮状态**: 点击后显示"⏳ ..."，成功显示"✅ 已开始"，失败显示"❌ 失败"，2 秒后恢复
- **国际化**: 所有用户可见文本使用 `chrome.i18n.getMessage()`
- **主题**: 深色主题（Popup UI）

### 性能

- **MutationObserver**: 使用 `{ childList: true, subtree: true }` 配置
- **防抖**: 使用 `setTimeout` 实现 300ms 防抖
- **内存**: 使用 `Map` 存储已注入的链接，避免重复处理

---

## 文件结构

```
doget-chrome-extension/
├── src/
│   ├── background.js       # Service Worker（加速逻辑）
│   ├── content.js          # Content Script（注入逻辑）
│   ├── content.css         # 注入按钮样式
│   ├── popup.html          # Popup UI
│   ├── popup.js            # Popup 逻辑
│   └── popup.css           # Popup 样式
├── icons/                  # 扩展图标
├── _locales/               # 国际化
├── manifest.json           # 扩展清单
├── scripts/build.js        # 构建脚本
├── package.json            # 开发工具配置
├── CLAUDE.md               # AI 开发指引
└── .specs/                 # flow-kit 工作流产物
    └── universal-resource-acceleration/
        ├── CHANGE.md
        └── REQUIREMENT.md
```

---

## 开发命令

```bash
# Lint JavaScript
npm run lint

# Format 所有代码
npm run format

# 检查格式（不修改）
npm run format:check

# 构建扩展包（用于发布）
npm run build
```

---

## 测试方法

1. **加载扩展**: `chrome://extensions/` → 开发者模式 → 加载已解压的扩展程序 → 选择项目根目录
2. **测试右键菜单**: 右键点击任意下载链接 → 选择"DoGet 加速下载此链接"
3. **测试 Popup**: 点击扩展图标 → 粘贴 URL → 点击"加速下载"
4. **测试自动注入**: 访问 GitHub Release 页面或其他下载站 → 验证按钮出现

---

> 本文档由 flow-kit 工作流维护，每次 change 完成后更新。
