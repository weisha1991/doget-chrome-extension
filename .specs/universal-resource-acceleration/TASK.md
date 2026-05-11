# TASK: 通用资源加速支持

- **Change ID**: `universal-resource-acceleration`
- **关联**: `@.specs/universal-resource-acceleration/REQUIREMENT.md`、`@.specs/universal-resource-acceleration/DESIGN.md`

---

## 波次划分

```
Wave 1 (parallel): T01[P], T02[P]
Wave 2:            T03               (depends on T01, T02)
Wave 3:            T04               (depends on T03)
Wave 4 (parallel): T05[P], T06[P]   (depends on T04)
Wave 5:            T07               (depends on T05, T06)
```

> 同 wave = 可并行；跨 wave = 必须顺序执行。

---

## 任务清单

```xml
<task id="T01" parallel="true" status="done">
  <name>实现通用链接识别引擎（LinkDetector）</name>
  <read_files>
    src/content.js
    .specs/universal-resource-acceleration/DESIGN.md
    .specs/CONTEXT.md
  </read_files>
  <write_files>
    src/content.js
  </write_files>
  <action>
    在 src/content.js 中实现 LinkDetector 模块，包含以下函数：
    
    1. isDownloadLink(el) - 主入口，组合 3 种策略判断是否为下载链接
    2. matchFileExtension(href) - 策略 A：匹配文件扩展名
       支持：.zip, .tar.gz, .7z, .rar, .bz2, .xz, .exe, .dmg, .deb, .rpm, .apk, .msi, .pkg, .AppImage, .flatpak, .snap, .tar, .tgz, .iso, .img, .bin
    3. matchUrlPattern(href) - 策略 B：匹配 URL 特征
       路径包含：/download/, /releases/, /dist/, /files/, /attachments/
       域名包含：cdn., dl., download., files., releases.
       查询参数：?download=, ?file=, ?attachment=
    4. matchDownloadAttribute(el) - 策略 C：检查 download 属性
    
    组合逻辑：策略 A OR 策略 B → 高置信度；仅策略 C → 中置信度；都不命中 → 返回 false
    
    保留既有的 isAssetLink() 函数（用于 GitHub Release 场景），但内部调用 isDownloadLink() + GitHub URL 检查。
    
    见 DESIGN.md D2（组合识别策略）、图 2.3（链接识别流程）。
  </action>
  <verify>
    创建测试 HTML 页面（test-links.html），包含 20 个不同类型的链接（文件扩展名、URL 特征、download 属性、普通链接），手动验证识别准确率 ≥ 90%，误检率 < 5%
  </verify>
  <done>
    LinkDetector 模块实现完成，识别逻辑符合 AC-2、AC-3、AC-4、AC-5
  </done>
  <depends_on></depends_on>
</task>

<task id="T02" parallel="true" status="done">
  <name>实现性能优化层（防抖 + 链接上限）</name>
  <read_files>
    src/content.js
    .specs/universal-resource-acceleration/DESIGN.md
  </read_files>
  <write_files>
    src/content.js
  </write_files>
  <action>
    在 src/content.js 中实现性能优化层：
    
    1. debounce(fn, delay) - 防抖工具函数，delay = 300ms
    2. LINK_COUNT_LIMIT 常量 = 100
    3. 修改 collectedLinks Map，增加计数逻辑，超过 100 个链接时停止注入
    
    见 DESIGN.md D3（链接上限 100）、D4（防抖 300ms）。
  </action>
  <verify>
    创建测试 HTML 页面（test-performance.html），包含 150 个下载链接，验证：
    1. 只注入前 100 个按钮
    2. 使用 console.time() 测量注入耗时 ≤ 500ms
    3. 动态添加链接时，MutationObserver 触发后延迟 300ms 才处理
  </verify>
  <done>
    性能优化层实现完成，符合 AC-6、AC-7、AC-8
  </done>
  <depends_on></depends_on>
</task>

<task id="T03" parallel="false" status="done">
  <name>实现布局冲突检测与自动降级</name>
  <read_files>
    src/content.js
    src/content.css
    .specs/universal-resource-acceleration/DESIGN.md
  </read_files>
  <write_files>
    src/content.js
  </write_files>
  <action>
    在 src/content.js 中实现布局冲突检测：
    
    1. checkLayoutConflict(linkEl) - 检测注入按钮是否会导致布局冲突
       检查 1：父元素是否存在
       检查 2：插入位置是否已有其他按钮紧贴（margin < 4px）
       检查 3：按钮是否会超出父容器边界
       返回 true（有冲突）或 false（无冲突）
    
    2. 修改 injectButton(linkEl) 函数：
       - 调用 checkLayoutConflict(linkEl)
       - 如果返回 true，跳过注入（自动降级为仅右键菜单）
       - 如果返回 false，继续注入按钮
    
    沿用既有的 injectButton() 逻辑（创建按钮、设置样式、插入 DOM）。
    
    见 DESIGN.md D5（布局冲突检测）、图 2.4（布局冲突检测流程）。
  </action>
  <verify>
    创建测试 HTML 页面（test-layout-conflict.html），包含 5 种布局场景：
    1. 正常布局（有足够空间）
    2. 紧凑布局（已有按钮紧贴）
    3. 父元素不存在
    4. 按钮会超出父容器
    5. 正常布局但父元素很小
    手动验证：场景 1 注入按钮，场景 2-5 自动降级（不注入）
  </verify>
  <done>
    布局冲突检测实现完成，符合 AC-9
  </done>
  <depends_on>T01, T02</depends_on>
</task>

<task id="T04" parallel="false" status="done">
  <name>实现场景路由（GitHub Release vs 通用网站）</name>
  <read_files>
    src/content.js
    .specs/universal-resource-acceleration/DESIGN.md
  </read_files>
  <write_files>
    src/content.js
  </write_files>
  <action>
    在 src/content.js 中实现场景路由：
    
    1. detectScene() - 检测当前页面场景
       如果 URL 匹配 /github\.com\/.*\/releases/ → 返回 "github-release"
       否则 → 返回 "generic"
    
    2. 重构主流程：
       - 调用 detectScene() 判断场景
       - 如果是 "github-release"：
         * 使用 isAssetLink() 识别链接（保留既有逻辑）
         * 注入单个按钮 + 批量工具栏（保留既有 ensureToolbar() 逻辑）
       - 如果是 "generic"：
         * 使用 isDownloadLink() 识别链接（新逻辑）
         * 仅注入单个按钮（不显示批量工具栏）
    
    3. 保留既有的 handleAccelerate()、handleBatchAccelerate()、updateToolbar() 函数不变
    
    见 DESIGN.md D6（GitHub Release 保留批量工具栏）、图 2.2（Content Script 内部架构）。
  </action>
  <verify>
    手动测试：
    1. 访问 GitHub Release 页面（如 https://github.com/microsoft/vscode/releases），验证：
       - 单个按钮正常注入
       - 批量工具栏显示
       - 批量加速功能正常
    2. 访问通用下载站（如 SourceForge），验证：
       - 单个按钮正常注入
       - 无批量工具栏
  </verify>
  <done>
    场景路由实现完成，符合 AC-14
  </done>
  <depends_on>T03</depends_on>
</task>

<task id="T05" parallel="true" status="done">
  <name>更新 manifest.json 的 content_scripts 配置</name>
  <read_files>
    manifest.json
    .specs/universal-resource-acceleration/DESIGN.md
  </read_files>
  <write_files>
    manifest.json
  </write_files>
  <action>
    修改 manifest.json 的 content_scripts 配置：
    
    1. 将 matches 从：
       ["https://github.com/*/releases/*", "https://github.com/*/releases", "https://github.com/*/tags/*"]
       改为：
       ["http://*/*", "https://*/*"]
    
    2. 保持其他字段不变（js、css、run_at）
    
    见 DESIGN.md D7（manifest 配置）、AC-15。
  </action>
  <verify>
    cat manifest.json | grep -A 10 content_scripts | grep -E "http://|https://"
  </verify>
  <done>
    manifest.json 更新完成，符合 AC-15
  </done>
  <depends_on>T04</depends_on>
</task>

<task id="T06" parallel="true" status="done">
  <name>适配 content.css 样式以兼容不同网站</name>
  <read_files>
    src/content.css
    .specs/universal-resource-acceleration/DESIGN.md
  </read_files>
  <write_files>
    src/content.css
  </write_files>
  <action>
    扩展 src/content.css 以适配不同网站布局：
    
    1. 保留既有的 .doget-accelerate-btn 样式（已通用）
    2. 增加响应式适配：
       - 确保按钮在不同字体大小下显示正常
       - 确保按钮在深色/浅色背景下都可见（使用半透明背景 + 边框）
    3. 增加 z-index 确保按钮不被其他元素遮挡
    4. 保留既有的批量工具栏样式（#doget-batch-toolbar）
    
    沿用既有的按钮样式（绿色边框、透明背景、hover 变实心）。
  </action>
  <verify>
    手动测试：访问 5 个不同风格的网站（深色主题、浅色主题、紧凑布局、宽松布局、自定义字体），验证按钮显示正常且不破坏原页面布局
  </verify>
  <done>
    CSS 样式适配完成，按钮在不同网站上显示正常
  </done>
  <depends_on>T04</depends_on>
</task>

<task id="T07" parallel="false" status="pending">
  <name>集成测试与验收</name>
  <read_files>
    src/content.js
    src/content.css
    manifest.json
    .specs/universal-resource-acceleration/REQUIREMENT.md
  </read_files>
  <write_files>
    无（仅测试，不修改代码）
  </write_files>
  <action>
    在 20 个典型下载站进行集成测试（见 REQUIREMENT.md 测试用例清单）：
    
    1. 开源软件：SourceForge、FossHub、FileHippo
    2. 代码托管：GitLab Releases、Gitea Releases、Bitbucket Downloads
    3. 包管理器：npm、PyPI、RubyGems、Maven Central
    4. 软件官网：VLC、Firefox、LibreOffice、GIMP
    5. 镜像站：清华大学开源镜像、阿里云镜像、华为云镜像
    6. 文档站：Read the Docs（PDF 下载）、GitHub Gist（Raw 文件）
    7. 其他：Archive.org、Internet Archive、Zenodo
    
    验证项：
    - 识别准确率 ≥ 90%（AC-1）
    - 误检率 < 5%（AC-5）
    - 注入延迟 ≤ 500ms（AC-6）
    - 按钮点击加速成功（AC-10）
    - 按钮点击加速失败时状态反馈正确（AC-11）
    - 右键菜单兜底功能正常（AC-12）
    - Popup 手动输入兜底功能正常（AC-13）
    
    记录测试结果到 .specs/universal-resource-acceleration/TEST-RESULTS.md
  </action>
  <verify>
    手动测试完成，测试结果文档存在且所有 AC 通过
  </verify>
  <done>
    集成测试完成，所有验收准则（AC-1 至 AC-15）通过
  </done>
  <depends_on>T05, T06</depends_on>
</task>
```

---

## 状态字段说明

- `status="pending"` — 未开始
- `status="in_progress"` — 进行中（同时只允许一个非 [P] 任务为此状态）
- `status="done"` — 已完成（verify 通过）
- `status="blocked"` — 阻塞（必须在文件末尾「阻塞日志」记录）

---

## 阻塞日志

| 任务 | 阻塞原因 | 待人工决策项 | 时间 |
|---|---|---|---|
|  |  |  |  |

---

## Fix 任务（来自 REVIEW / INTEGRATION）

> 此区域由 review/integration 阶段自动追加，编号 `T-FIX-XX`。

```xml
<!-- 占位 -->
```
