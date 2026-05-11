# T04-SUMMARY: 实现场景路由（GitHub Release vs 通用网站）

- **任务 ID**: T04
- **状态**: 已完成
- **执行时间**: 2026-05-08
- **关联**: `@.specs/universal-resource-acceleration/TASK.md`、`@.specs/universal-resource-acceleration/DESIGN.md`

---

## 执行计划

### 1. 沿用既有抽象 grep（R6.4）

```bash
# 检查是否已有场景检测逻辑
grep -rn "detectScene\|scene\|routing" src/content.js
# 结果：无命中

# 检查既有的 GitHub Release 逻辑
grep -rn "isAssetLink\|ensureToolbar\|handleBatchAccelerate" src/content.js
# 结果：已存在，需保留
```

**结论**：
- ✅ 无既有场景检测逻辑 → 新建（DESIGN D6 已批准）
- ✅ 既有 GitHub Release 功能完整 → 保留并路由
- ✅ 既有 LinkDetector 模块（T01）→ 复用

### 2. 扫描 LESSONS（R1.8）

```bash
grep -rn "scene\|routing\|github" .specs/LESSONS.md
# 结果：无命中（LESSONS.md 为空骨架）
```

**结论**：无相关历史教训，可直接实现。

### 3. 实现内容

根据 DESIGN.md D6（GitHub Release 保留批量工具栏）和图 2.2（Content Script 内部架构），实现以下模块：

#### 3.1 场景检测函数

**新增函数**：`detectScene()`

```javascript
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
```

**检测逻辑**：
- 匹配 URL 模式 `/github\.com\/.*\/releases/`
- 命中 → 返回 `"github-release"`
- 未命中 → 返回 `"generic"`

#### 3.2 场景路由实现

**模块级场景检测**（第 399 行）：
```javascript
const currentScene = detectScene();
console.log('[DoGet] Scene detected:', currentScene);
```

**scanAndInject() 函数路由**（第 402-426 行）：
```javascript
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
```

**MutationObserver 路由**（第 432-446 行）：
```javascript
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
```

**批量工具栏条件显示**（第 326-338 行）：
```javascript
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
```

#### 3.3 保留既有功能

**完全保留的函数**（无修改）：
- `handleAccelerate()` - 单个加速处理
- `handleBatchAccelerate()` - 批量加速处理
- `ensureToolbar()` - 工具栏创建
- `isAssetLink()` - GitHub Release 链接识别
- `isDownloadLink()` - 通用链接识别（T01）
- `checkLayoutConflict()` - 布局冲突检测（T03）

---

## 实现细节

### 代码位置

- **文件**: `src/content.js`
- **新增行数**: 
  - 第 248-254 行：`detectScene()` 函数
  - 第 399-400 行：模块级场景检测
  - 第 402-426 行：`scanAndInject()` 场景路由
  - 第 432-446 行：MutationObserver 场景路由
  - 第 326-330 行：`updateToolbar()` 条件显示

### 关键设计点

1. **单次检测**：场景在模块加载时检测一次，存储在 `currentScene` 常量中
2. **双路由点**：初始扫描（scanAndInject）和动态监听（MutationObserver）都实现路由
3. **向后兼容**：GitHub Release 场景完全保留既有逻辑（isAssetLink + 批量工具栏）
4. **条件 UI**：批量工具栏仅在 GitHub Release 场景显示，避免通用网站 UI 混乱
5. **日志输出**：场景检测结果输出到控制台，便于调试

---

## 验证结果

### 测试方法

创建测试页面 `test-links.html`，包含 18 个测试用例（14 个下载链接 + 4 个普通链接）。

通过本地 HTTP 服务器（`python3 -m http.server 8080`）访问测试页面。

### 测试结果

**场景检测**：
```
[DoGet] Scene detected: generic
```

**链接扫描**：
```
[DoGet] Scanning 18 links
[DoGet] Injecting button for: https://example.com/file.zip
[DoGet] Injecting button for: https://example.com/archive.tar.gz
[DoGet] Injecting button for: https://example.com/app.exe
[DoGet] Injecting button for: https://example.com/installer.dmg
[DoGet] Injecting button for: https://example.com/package.deb
[DoGet] Injecting button for: https://example.com/software.rpm
[DoGet] Injecting button for: https://example.com/app.apk
[DoGet] Injecting button for: https://example.com/setup.msi
[DoGet] Injecting button for: https://cdn.example.com/resource.pdf
[DoGet] Injecting button for: https://dl.example.com/file.bin
[DoGet] Injecting button for: https://example.com/download/file.txt
[DoGet] Injecting button for: https://example.com/files/document.pdf
[DoGet] Injecting button for: https://example.com/dist/bundle.js
[DoGet] Injecting button for: https://example.com/file.pdf
[DoGet] Initial scan complete
```

**统计结果**：
- 应该检测到：14 / 14（漏检：0）
- 不应该检测到：4 / 4（误检：0）
- 总体准确率：100.0%（目标：≥ 90%）
- 误检率：0.0%（目标：< 5%）
- ✅ 测试通过

**批量工具栏**：
- ✅ 通用网站（test-links.html）：无批量工具栏
- ✅ GitHub Release 页面：批量工具栏正常显示（向后兼容）

---

## 6 维自查

### ✅ 1. 沿用既有抽象（R6.4）

- `isAssetLink()` → 保留用于 GitHub Release 场景
- `isDownloadLink()` → 复用用于通用场景（T01）
- `ensureToolbar()` → 保留不变
- `handleBatchAccelerate()` → 保留不变
- `scanAndInject()` → 扩展增加场景路由
- `detectScene()` → 新建（无既有实现）

### ✅ 2. 边界遵守（R6.5）

**read_files**:
- ✅ `src/content.js` - 已读取
- ✅ `.specs/universal-resource-acceleration/DESIGN.md` - 已参考

**write_files**:
- ✅ `src/content.js` - 仅修改此文件
- ✅ `test-links.html` - 测试文件（不在禁动清单）

**禁动清单**:
- ✅ 未触碰 `src/popup.js`
- ✅ 未触碰 `src/popup.html`
- ✅ 未触碰 `src/popup.css`
- ✅ 未触碰 `src/background.js`
- ✅ 未触碰 `src/content.css`（T06 任务）
- ✅ 未触碰 `manifest.json`（T05 已完成）

### ✅ 3. 测试覆盖（R2.3）

- ✅ 复用测试页面 `test-links.html`（T01 创建）
- ✅ 包含 18 个测试用例（14 个下载链接 + 4 个普通链接）
- ✅ 启动本地 HTTP 服务器进行测试
- ✅ 验证命令：访问 http://localhost:8080/test-links.html
- ✅ 验证 GitHub Release 场景：访问真实 GitHub Release 页面

### ✅ 4. 破坏性变更检查（R4.6）

**修改的函数**：
- `scanAndInject(root)` - 增加场景路由，但未改变签名
- `updateToolbar()` - 增加场景判断，但未改变签名
- MutationObserver 回调 - 增加场景路由，但未改变行为

**grep 引用**：
```bash
grep -rn "scanAndInject\|updateToolbar" src/content.js
# 结果：仅在 src/content.js 内部使用
```

**结论**：
- ✅ 函数仅在内部使用，无破坏性变更
- ✅ 行为变更（增加场景路由）符合设计预期
- ✅ GitHub Release 场景完全向后兼容
- ✅ 无需反问用户

### ✅ 5. Schema 变更检查（R4.5）

- ✅ 本任务不涉及数据库 Schema 变更

### ✅ 6. UI 任务检查（R1.6）

- ✅ 本任务涉及 UI（条件显示批量工具栏），但不涉及新的 UI 设计
- ✅ 复用既有工具栏样式（`src/content.css`）
- ✅ 无需加载 UI-DESIGN.md

---

## 完成判定

- ✅ `detectScene()` 函数实现完成
- ✅ 场景检测逻辑：GitHub Release vs 通用网站
- ✅ `scanAndInject()` 增加场景路由
- ✅ MutationObserver 增加场景路由
- ✅ `updateToolbar()` 增加场景判断（仅 GitHub Release 显示）
- ✅ 保留所有既有函数不变（handleAccelerate、handleBatchAccelerate、ensureToolbar）
- ✅ 测试通过：100% 准确率，0% 误检率
- ✅ 向后兼容：GitHub Release 功能完全保留
- ✅ 符合 AC-14（场景路由实现）

---

## 下一步

- T04（Wave 3）已完成
- 进入 Wave 4：T06（CSS 适配以兼容不同网站）
- T05（Wave 4）已提前完成（manifest.json 修改）
- Wave 4 完成后进入 Wave 5：T07（集成测试与验收）
