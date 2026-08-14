# Architecture

> 只描述**现在实际采用什么**。未来设想一律带 `[PLANNED]` 标签，详见 `ROADMAP.md`。

## 定位

DeepSeek Harness Workbench 是 DeepSeek Harness 官方架构的**桌面发行状态**，不是新的 Harness、插件框架或 Agent 框架。

## 三层目标架构（长期固定，不加第四层）

```text
┌──────────────────────────────────────┐
│        Electron Application          │
│  Window / IPC / Process / Update     │
│  Frameless + self-drawn controls     │
└────────────────┬─────────────────────┘
                 ▼
┌──────────────────────────────────────┐
│             DSH Profile              │
│  dsh-base + official bundles         │
│  + workbench-desktop bundle          │
│  + user bundles + cordis.patch.yml   │
└────────────────┬─────────────────────┘
                 ▼
┌──────────────────────────────────────┐
│   Official DeepSeek Harness          │
│  Host/Client Cordis Runtime          │
│  Services / Tools / Agents           │
│  Subagents / Workflow / UI Slots     │
└──────────────────────────────────────┘
```

## 窗口方案（2026-08-15 更新）

Workbench 使用无边框窗口（frameless window），**Windows/macOS 采用完全自绘窗口控制按钮**，不再依赖系统 titleBarOverlay：

| 平台 | 方案 |
|---|---|
| **Windows** | `frame: false` + 主进程注入的自绘窗口控制条（32px 全宽顶部拖拽条 + 右侧 3 个按钮） |
| **macOS** | 预留 `titleBarStyle: "hiddenInset"`（原生红绿灯按钮内嵌），待实测 |
| **Linux** | `frame: false`（待测试，需完全自绘控制按钮） |

**自绘窗口控制条（`WINDOW_CONTROLS_JS`）**：主进程在 `did-finish-load` 后通过 `webContents.executeJavaScript()` 注入一个全宽 32px 顶部拖拽条（`position:fixed; left:0; right:0`），左侧为窗口拖拽区，右侧固定最小化/最大化/关闭三个按钮。按钮样式对齐 Windows 11 / TraeWork 风格：默认深灰图标 `#333`、hover 淡灰背景 `rgba(0,0,0,0.06)` 图标变纯黑、关闭按钮 hover 经典红 `#e81123`。**自适应主题**：读取页面背景色亮度，浅色背景自动用深色图标、深色背景自动切换浅色图标（`MutationObserver` 监听主题变化）。

**拖拽与内容对齐**：整条控制条 `-webkit-app-region: drag`，按钮本身 `no-drag`；注入脚本自动给 `body` 添加 `padding-top:32px` 防止内容被标题栏遮挡。

**窗口控制 IPC**：preload 通过 `contextBridge` 暴露 `window.workbenchWindow` API（minimize / maximizeToggle / close / isMaximized / onMaximizedChange），供自定义 UI 调用。

**Bootstrap fallback 页**：`renderer-bootstrap/index.html` 内置了自定义标题栏（32px 高 + 最小化/最大化/关闭按钮），dsh web 加载失败时显示。

**官方 UI（Phase 0 loopback）**：通过注入的全局自绘控制条获得窗口控制能力，无需修改官方 dsh-web-app 代码（符合 ADR-005）。


## 当前实现状态（2026-08-14）

| 组成 | 状态 | 说明 |
|---|---|---|
| 仓库骨架 + pnpm workspace | [IMPLEMENTED] | apps/* + packages/* |
| 架构守卫脚本 | [IMPLEMENTED] | `build/scripts/check-architecture.mjs`（代码未在本机运行过：Node 未安装，见 STATUS） |
| Electron main 最小骨架 | [IMPLEMENTED] | 单实例 + BrowserWindow（**无边框 frameless + 完全自绘窗口控制条**）+ Phase 0 URL 解析 + 窗口控制 IPC |
| 无边框窗口 + 自绘窗口控制条 | [IMPLEMENTED] | Windows `frame:false` + 主进程注入 `WINDOW_CONTROLS_JS`（32px 拖拽条 + 3 按钮，自适应主题）；bootstrap 页自定义标题栏 |
| Phase 0：bundled `dsh web` loopback | [PLANNED] | M1；当前仅支持 `WORKBENCH_PHASE0_URL` 环境变量直连 |
| electron-carrier（官方 RPC over IPC） | [PLANNED] | M2 |
| native-provider（官方 seam 上的 Provider） | [PLANNED] | M2 起按需 |
| desktop-bundle（workbench-desktop） | [PLANNED] | M2 起 |
| workbench Profile | [PLANNED] | manifest 由官方 `dsh plugin` 维护，本仓库只放模板说明 |
| NSIS/Portable 安装包 | [PLANNED] | M1 |
| Extension Center / IDE / Multi-Agent | [PLANNED] | 独立插件或可选 Bundle，M3+，不进本仓库核心 |

## 载体演进路线

```text
Phase 0（M1，临时）：Electron → 启动 bundled dsh web → 随机 loopback port → BrowserWindow（frameless + 注入自绘窗口控制条）
Phase 1（M2，正式）：Renderer → 官方 ApiProxy → IPC carrier（packages/electron-carrier）→ 官方 Host Runtime
```

不变量：**carrier 更换不得导致 Renderer 代码变化**；禁止 `workbench.invoke(...)` 私有 RPC。

## 数据目录

- 安装版默认 `DSH_HOME = ~/.dsh`，Profile 位于 `~/.dsh/profiles/workbench`；与命令行 `dsh plugin` 同一生态
- Portable 例外：`DSH_HOME = <portable>/data/.dsh`
- 不创建 `~/.workbench/plugins` 等平行目录

## 仓库地图

见根目录 `README.md`。架构宪法（六条原则）见 `AGENTS.md` 与 `AI_PROJECT_MEMORY.md` §2。
