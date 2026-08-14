# Decisions

只追加，不随意删除历史决策。格式见 `AI_PROJECT_MEMORY.md` §6。

---

## ADR-001：不创建 Workbench Plugin API

- 日期：2026-08-14
- 状态：Accepted

**决定**：Workbench 只使用 DeepSeek Harness / Cordis Plugin，不提供 `workbench.registerPlugin/Panel/Tool/Agent` 等注册 API。

**原因**：避免形成第二套生态；社区标准 DSH 插件必须不改版即可运行在 Workbench（`dsh web` 能用 → Workbench 能用）。

**后果**：Workbench 专属功能一律实现为标准 DSH Host/Client Plugin。架构守卫以正则扫描强制执行（P2）。

**官方架构对应**：官方"一切皆插件"（Cordis）。

---

## ADR-002：Electron 仅作为 Application Carrier，Phase 0 loopback 为临时例外

- 日期：2026-08-14
- 状态：Accepted

**决定**：Renderer 与 Host 通信走官方 ApiProxy 逻辑协议；Electron IPC carrier（M2，`packages/electron-carrier`）只做传输。M1 允许临时启动 bundled `dsh web`（随机 loopback port）作为 Phase 0 兼容启动。

**原因**：官方 GUI 协议本身逻辑 API 与物理 carrier 解耦，Electron 是该分层的目标 Client。

**后果**：禁止 `workbench.invoke(...)` 私有 RPC（守卫 P7）；carrier 更换不得改变 Renderer 代码；Phase 0 代码须在 M2 移除，验收标准为 Renderer 不依赖 `127.0.0.1`。

**官方架构对应**：GUI layering / RPC protocol 设计文档。

---

## ADR-003：默认 `DSH_HOME = ~/.dsh`，Portable 隔离例外

- 日期：2026-08-14
- 状态：Accepted

**决定**：安装版与命令行 `dsh` 共用 `~/.dsh` 生态；不创建 `~/.workbench/plugins` 平行目录。Portable 模式 `DSH_HOME = <portable>/data/.dsh`。

**原因**：保证 GUI 与 CLI 操作同一 Profile/插件生态；Portable 隔离是发行需求，不改变 Profile 格式。

**后果**：用户数据永不写入安装目录；卸载不触碰 `~/.dsh`。

---

## ADR-004：每个 Workbench 版本固定一个经测试的 DSH 版本

- 日期：2026-08-14
- 状态：Accepted

**决定**：升级 = 上游新版本 → 自动 upgrade PR → 构建 + 架构测试 + profile boot + 插件 + UI + subagent 测试 + 打包 + 安装包冒烟 → 通过后随 Workbench Release 发布。不在用户机器上执行 `@latest` 更新。

**原因**：官方 Developer Preview，明确存在 breaking changes。

**后果**：跟随官方实现为 "Workbench Release 自动跟随官方 Core"，而非客户端偷换 Runtime。pin 记录于 `UPSTREAM.md`。

---

## ADR-005：不 fork / 不 vendor 官方 Core

- 日期：2026-08-14
- 状态：Accepted

**决定**：`packages/` 下禁止出现 `@deepseek-ai/**`（守卫 P1）。确需修改上游时：独立 patch + 登记 `docs/UPSTREAM_PATCHES.md`（届时创建）+ 说明官方 seam 为何无法解决 + 官方出正式接口后移除。

**原因**：长期维护 fork 成本最高，违背发行版定位。

**官方架构对应**：插件依赖抽象 capability/service，而非具体 Provider。

---

## ADR-006：Extension Center / IDE / Multi-Agent / Collaboration 均为独立插件或可选 Bundle

- 日期：2026-08-14
- 状态：Accepted

**决定**：Extension Center 是可卸载插件（只做发现 + 调用官方 `dsh plugin`）；IDE 是可选 Bundle（优先 External VS Code Bridge）；Multi-Agent 基于 `ctx.subagents` + WorkflowEngine；多人协作在真实 Provider+Consumer 出现前不创建任何接口。

**原因**：防止仓库膨胀成第二平台；架构宪法原则二/五。

**后果**：本仓库核心保持三层结构；这些功能后续独立 package/仓库。

---

## ADR-007：架构守卫脚本进入 CI

- 日期：2026-08-14
- 状态：Accepted

**决定**：`build/scripts/check-architecture.mjs`（规则 P1/P2/P3/P6/P7，对应工程规格书 §37/§38）作为 CI 必过门禁。

**原因**：执行 Agent 最容易把项目做歪的点（私有 API、平行格式、main 膨胀、vendor core）可被静态扫描捕获。

**后果**：规则变更须先登记 ADR；误报时调整规则而非绕过门禁。

---

## ADR-008：DSH pin = @deepseek-ai/dsh@0.1.0-rc.6（exact）

- 日期：2026-08-14
- 状态：Accepted

**决定**：apps/electron 以 exact 版本依赖 `@deepseek-ai/dsh@0.1.0-rc.6`；workbench Profile（`~/.dsh/profiles/workbench`）bundles 固定为同版本线的 `[dsh-base, dsh-web-app]`。

**原因**：rc.6 为 npm `latest`（2026-08-13），且是首个 public 发布（此前 restricted）；上游经 registry 元数据直查核实（官方 org / MIT），未凭记忆猜测。官方 Developer Preview 明确存在 breaking changes，必须 exact pin。

**验证**：`dsh --profile workbench --dump-config` exit=0（490 行组合树，M0 验收）。

**后果**：升级仅经 `UPSTREAM.md` 固定流程；Profile 内原生依赖构建需 profile 自身 `pnpm-workspace.yaml` 的 `allowBuilds`（见 KI-005）。

**官方架构对应**：Profile = 有序 Bundle 层叠 + patch，manifest 由 `dsh plugin` 维护。

---

## ADR-009：安装包自带完整 runtime（node.exe + hoisted dsh），staging 必须 autoInstallPeers

- 日期：2026-08-14
- 状态：Accepted

**决定**：安装包经 electron-builder `extraResources` 分发 `resources/node/node.exe`（v24.19.0）+ `resources/dsh/node_modules`（hoisted 全量依赖，`autoInstallPeers: true`）。Electron main 优先用 bundled node 启动 bundled dsh。

**原因**：M1 验收要求"无 Node 的 Windows 机器可直接安装运行"。实测发现 `dsh-app-boot` 的 `cordis-plugin-group` 等是 peerDependencies，官方 profile 模板的 `autoInstallPeers: false` 会导致 staging 直接 ERR_MODULE_NOT_FOUND（KI-006）；npx 场景能跑正是因为 npm 默认 auto-install peers。

**验证**：Portable 产物真实启动 PASS（smoke marker：boot dsh web → 随机端口 → HTTP 200 → 官方 UI 加载）。

**后果**：升级 DSH 固定流程新增硬门禁：`<staged node> <staged dsh>/lib/bin.js --version` 必须通过才可打包；用户机器不参与 runtime 安装（符合"不偷换 Runtime"原则）。

**官方架构对应**：Runtime 由发行方安装（等价 npx 安装方），Profile/插件生态留在 `~/.dsh` 由官方 `dsh plugin` 管理。

---

## ADR-010：Profile 模板随包分发，首启离线复制（而非运行时调 `dsh plugin add`）

- 日期：2026-08-14
- 状态：Accepted

**决定**：构建期 `prepare-runtime.mjs` 在沙盒 `DSH_HOME` 用**官方命令** `dsh plugin --profile workbench add @deepseek-ai/dsh-web-app@<pin>` 生成 pristine profile（含 KI-005 allowBuilds 修补重试 + bundles manifest 校验），作为 `resources/profile-template/workbench` 随安装包分发。Electron main 首启检测到用户 DSH_HOME 无该 profile 时整目录复制（幂等，`package.json` 存在即跳过）。不在用户机器上运行 pnpm/联网。

**原因**：干净机器验收（无 Node、无网络知识）要求首启零依赖；运行时调 `dsh plugin add` 需要 pnpm+网络且受 pnpm 构建许可语义（KI-005）影响不可控。模板仍由官方命令产出，非手工拼装，不违反"不造第二套格式"。

**验证**：冒烟双场景 PASS——① 干净 DSH_HOME：离线复制 + web boot + HTTP 200；② Portable：`<exe>/data/.dsh` 出现 profile（ADR-003）。

**后果**：升级 DSH 流程新增：重新生成模板（prepare-runtime 自动，版本 marker 幂等）；用户已有 profile 时不覆盖（升级策略另行决策）；模板体积 +51MB 进安装包。

---

## ADR-011：无边框窗口（Frameless Window）+ titleBarOverlay 方案

- 日期：2026-08-14
- 状态：Accepted

**决定**：Workbench Electron 窗口采用无边框（`frame: false`）方案；Windows 平台使用 `titleBarOverlay` 原生控制按钮覆盖层，macOS 使用 `hiddenInset`，拖拽区域通过主进程 `webContents.insertCSS()` 注入 `-webkit-app-region: drag` 样式实现。

**原因**：
1. 标准 Windows 标题栏视觉与现代桌面应用审美不符；无边框窗口可获得更沉浸式的 UI 体验。
2. `titleBarOverlay`（Windows 10/11）由系统原生渲染最小化/最大化/关闭按钮，保留 Snap Assist、Aero Snap、系统菜单等 Shell 行为，比完全自绘标题栏更稳定。
3. 通过 Electron main 进程注入 CSS，Phase 0 加载官方 dsh-web-app 时无需修改上游代码（符合 ADR-005 不 fork 原则）。
4. Bootstrap fallback 页内置自定义标题栏作为参考实现，M2 desktop-bundle 可通过 `window.workbenchWindow` IPC API 实现自定义标题栏 UI。

**替代方案**：
- 标准有边框窗口（frame: true）：视觉原生但缺乏现代感，放弃。
- 完全自绘标题栏（frame: false + 纯 HTML/CSS 按钮）：放弃原生 Snap Assist / 系统菜单 / 右键菜单，Windows 11 Snap Layouts 失效。
- macOS hiddenInset + Windows titleBarOverlay 分别处理：采用此方案（跨平台原生体验）。

**后果**：
- 主进程新增 `FRAMELESS_CSS` 常量 + `did-finish-load` insertCSS 逻辑；preload 暴露 `window.workbenchWindow` IPC 桥。
- 官方 UI 顶部约 40px 区域为系统控制区（与 `titleBarOverlay.height` 一致）；如果官方 dsh-web-app 顶部有交互按钮，可能与 overlay 区域重叠，可通过未来 desktop-bundle 注入 patch CSS 微调。
- Bootstrap fallback 页已带自绘标题栏（40px），含 maximize/restore 图标切换、hover 红色关闭按钮。
- Linux 平台 `titleBarOverlay` 支持有限，需后续测试；如不可用则退化为纯 frame:false（需完全自绘控制按钮）。

**官方架构对应**：Electron 作为 Application Carrier（架构宪法原则六），窗口样式属于桌面发行层责任，不涉及 DSH/Cordis Plugin 层。
---

### ADR-011 修订（2026-08-15）：从 titleBarOverlay 改为完全自绘窗口控制按钮

**变更**：经真实 Windows 桌面人眼验收，`frame: false + titleBarOverlay` 组合存在冲突——系统原生的 titleBarOverlay 按钮与注入范围在同一区域重叠，导致最小化按钮视觉异常、图标在 hover 时消失等体验问题。正式落地改为**完全自绘**方案：

- 移除 `titleBarOverlay` 配置（不再依赖系统绘制按钮），仅保留 `frame: false`。
- 主进程通过 `WINDOW_CONTROLS_JS` 注入一个**全宽 32px 顶部拖拽条**（`left:0; right:0`），左侧为拖拽区，右侧固定三个自绘按钮（最小化/最大化/关闭）。
- 按钮样式对齐 Windows 11 / TraeWork 风格：默认深灰图标 `#333`、hover 淡灰背景 `rgba(0,0,0,0.06)` 图标变纯黑、关闭按钮 hover 经典红 `#e81123`。
- **自适应主题**：注入脚本读取页面背景色亮度，浅色背景自动用深色图标，深色背景自动切换浅色图标（`MutationObserver` 监听主题变化）。
- 注入脚本自动给 `body` 添加 `padding-top:32px` 防止内容被标题栏遮挡；窗口背景设为 `#ffffff` 对齐 dsh web 浅色主题。

**影响**：放弃 Windows 原生 Snap Assist / Aero Snap 的标题栏右键菜单（可通过按钮 hover 还原），换取与 TraeWork 一致的沉浸式自绘审美；Bootstrap fallback 页同步改为 32px 高度 + 相同按钮样式。

