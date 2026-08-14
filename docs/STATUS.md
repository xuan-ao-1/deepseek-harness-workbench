# Project Status

Last updated: 2026-08-14
Updated by: opencode（M1 收尾：无边框窗口 + frameless titleBarOverlay）

## Current Versions

| 项 | 值 |
|---|---|
| Workbench | 0.1.0 |
| DeepSeek Harness | **@deepseek-ai/dsh@0.1.0-rc.6**（exact pin） |
| Electron | 33.4.11 / electron-builder 26.x |
| Bundled Node（随包分发） | v24.19.0（build/runtime/node/node.exe） |
| 开发机 Node / pnpm | v24.19.0 / 11.21.0 |
| git | 2.54.0.windows.1 |

## Working

- [x] M0 全部内容（见 git 历史与 UPSTREAM.md）
- [x] Phase 0 启动链：Electron main → spawn bundled node+dsh → `--profile workbench --host 127.0.0.1 --port 0` → 解析 `dsh web: http://127.0.0.1:<port>` → loadURL 官方 UI（ADR-002 例外窗口，M2 移除）
- [x] Runtime staging（`build/scripts/prepare-runtime.mjs`）：hoisted dsh rc.6（`autoInstallPeers: true`，见 KI-006）+ node.exe（npmmirror）
- [x] 打包（`build/scripts/package.mjs`）：Setup + Portable + SHA256SUMS 已产出
- [x] 首次运行 bootstrap（ADR-010）：构建期用官方 `dsh plugin add` 在沙盒 DSH_HOME 生成 pristine profile 模板（`resources/profile-template/workbench`，51MB）→ 首启离线复制到用户 DSH_HOME（干净机器无需网络/pnpm）
- [x] Portable 数据隔离（ADR-003）：`PORTABLE_EXECUTABLE_DIR` → `DSH_HOME=<exe>/data/.dsh`；`WORKBENCH_DSH_HOME` 环境变量可覆盖（冒烟用）
- [x] 冒烟套件 **8 PASS / 0 FAIL / 1 SKIPPED**（arch guard 92 文件、pin、dump-config、web boot+HTTP 200、staging、产物、Portable 干净 DSH_HOME 离线 bootstrap、Portable 数据隔离）
- [x] 打包产物内使用内置 node（`resolveBundledNode` 优先 resourcesPath），不依赖系统 Node
- [x] **无边框窗口（Frameless）**：`frame: false` + Windows `titleBarOverlay`（原生最小化/最大化/关闭按钮覆盖层，40px 高）+ `insertCSS` 全局 `-webkit-app-region: drag` 拖拽注入 + `window.workbenchWindow` IPC 控制桥（ADR-011）
- [x] Bootstrap fallback 页自定义标题栏：40px 深色标题栏 + 自绘 min/max/close 按钮（hover 红色关闭）+ maximize/restore 图标切换

## Partial

- [ ] Electron 窗口人工视觉验证（本机为无头验证路径，smoke marker 证明链路；**无边框/拖拽/overlay 需真实 Windows 桌面人眼验收**）
- [ ] 干净虚拟机验证（无 Node、无 ~/.dsh 的真实首启场景）——本机以"干净 DSH_HOME + Setup 静默装到临时目录"近似覆盖，真 VM 仍待做

## Broken / Blocked

- （无）

## Current Architecture

Installer → Electron（单实例，**无边框窗口 + Windows titleBarOverlay**）→ resources/node/node.exe + resources/dsh（hoisted）→ `dsh --profile workbench --port 0`（随机 loopback）→ BrowserWindow 加载官方 Web UI。主进程 `did-finish-load` 后通过 `insertCSS` 注入全局拖拽样式（`body` 可拖拽，交互元素 no-drag）。用户生态：安装版 `~/.dsh`，Portable `<exe>/data/.dsh`。首启缺失 profile 时从 `resources/profile-template/workbench` 离线复制（ADR-010）。

## Current Profile

- Profile: workbench（bundles=[dsh-base, dsh-web-app]，rc.6）
- 模板来源：构建期官方 `dsh plugin --profile workbench add @deepseek-ai/dsh-web-app@0.1.0-rc.6` 于沙盒 DSH_HOME 生成（prepare-runtime.mjs，含 KI-005 allowBuilds 修补重试）

## Recent Changes

- 2026-08-14 (7)：**无边框窗口方案落地**（ADR-011）：`frame: false` + Windows `titleBarOverlay` + insertCSS 全局 app-region drag 注入 + preload 暴露 `window.workbenchWindow` IPC 桥 + bootstrap 页自绘标题栏（40px + min/max/close 按钮 + maximize 图标切换）；tsc --noEmit PASS
- 2026-08-14 (3)：M1 Phase 0 全链路打通 + 打包 + Portable 冒烟 PASS
- 2026-08-14 (4)：首启离线 profile bootstrap（ADR-010）+ Portable DSH_HOME 隔离（ADR-003 落地）+ 冒烟双场景 PASS + 进程清理加固（同步 taskkill + 按映像名预清理 + 600s 超时）
- 2026-08-14 (5)：官方文档清单 2-11 全部读完（结论入 UPSTREAM.md）；Setup.exe 静默安装/启动/卸载本机全流程验证 PASS
- 2026-08-14 (6)：应用图标改用官方 DeepSeek Harness 标志（github master `apps/web/public/favicon.svg` 鲸标，MIT）——Electron 离屏渲染 SVG→512PNG（透明底）→ electron-builder 自动转 ico；重打包 + 冒烟 8 PASS + 正式安装到 `%LOCALAPPDATA%\Programs\DeepSeek Harness Workbench`（桌面/开始菜单快捷方式 + 注册表 + 卸载器齐全），安装版可见启动成功

## Immediate Next Tasks

**M1 在本环境可达的验证已全部完成**；剩余无边框窗口人工视觉验证和真 VM 验证需外部条件。

1. [环境受限] **无边框窗口人工视觉验证**：拖拽移动、双击标题栏最大化/还原、titleBarOverlay 按钮 hover/点击、Snap Assist、Aero Snap 吸附、最大化状态下拖拽还原
2. [环境受限] 干净虚拟机 Setup.exe 交互安装验证（无 Node、无 ~/.dsh）
3. [下一里程碑] **M2 — Official Electron Carrier**（开工前读 UPSTREAM.md "阅读结论"：官方已预留路径 —— 子类化 `AbstractApiClient` 仅实现 `doFetch`；`dsh-host-webserver` 明文不被 Electron 复用；优先评估 `InProcessApiClient` 零端口方案）
4. 托盘/崩溃恢复/更新通道（可延后至 desktop-bundle）
5. Linux/macOS 无边框窗口兼容测试（titleBarOverlay Linux 支持有限，需备选方案）

## Handoff

### Goal

M1 收尾（无边框窗口 + frameless titleBarOverlay + 文档维护）→ 下一步进入 M2 Official Electron Carrier。

### Completed

- ADR-011：无边框窗口方案 — Windows `titleBarOverlay` 原生控制按钮 + insertCSS 全局 app-region drag 注入
- 主进程：`frame: false`、`titleBarOverlay` 配置、`registerWindowControls()` IPC 注册、`did-finish-load` CSS 注入、maximize/unmaximize 事件转发
- Preload：`contextBridge.exposeInMainWorld("workbenchWindow", ...)` 暴露 minimize/maximizeToggle/close/isMaximized/onMaximizedChange
- Bootstrap fallback 页：40px 自定义标题栏 + 自绘 min/max/close 按钮（SVG 图标）+ maximize 状态切换 + hover 红色关闭
- tsc --noEmit 编译通过（零错误）
- 文档同步更新：ARCHITECTURE（窗口方案章节）、DECISIONS（ADR-011）、STATUS（本次更新）

### Current Files

- `apps/electron/main/index.ts`（FRAMELESS_CSS 常量 + createWindow frameless 配置 + registerWindowControls IPC + insertCSS）
- `apps/electron/preload/index.ts`（contextBridge workbenchWindow API）
- `apps/electron/renderer-bootstrap/index.html`（自定义标题栏 + 窗口控制按钮 + 内联脚本）
- 文档：ARCHITECTURE.md / DECISIONS.md(ADR-011) / STATUS.md

### Current Problem

（无阻塞问题）无边框窗口拖拽/overlay/Snap 行为需真实 Windows 桌面人眼验收。Portable SFX 解压 3-4 分钟（KI-009）。

### Important Findings

- `webContents.insertCSS()` 在 `did-finish-load` 后注入即可对 SPA 持久生效（user stylesheet 级别），无需每次导航重注
- `titleBarOverlay` 与 `frame: false` 组合时 Windows 负责渲染右上角 46px 宽的三个按钮，覆盖在 Web 内容之上
- `-webkit-app-region: drag` 设置在 `body` 上 + 交互元素统一 `no-drag !important` 是 VS Code/Discord 等成熟 Electron 应用的通用策略
- Bootstrap fallback 页的自定义标题栏可作为 M2 desktop-bundle 标题栏的参考实现

### Do Not Change

- 架构宪法六条 + `pnpm arch:check` 门禁；dsh exact pin rc.6；不 fork core；不建 Workbench Plugin API
- `prepare-runtime.mjs` 的 `autoInstallPeers: true`（KI-006）与 allowBuilds 修补逻辑
- 无边框窗口的平台分支逻辑（Windows titleBarOverlay / macOS hiddenInset / Linux 待定）

### Next Action

M2 侦察已完成第一步（2026-08-14 查 npm）：`@deepseek-ai/dsh-host-apiproxy` / `dsh-host-webserver` / `dsh-client-connection` 均有 rc.6，**但 `dsh-host-runtime`（host 装配层/startHost）未发布（404）** → Electron main 无法从 npm 直接装配 host 插件树。M2 候选方向（写 ADR-011 前需评估）：① 保持子进程 `dsh web`，Electron 用自定义 scheme + `protocol.handle` 拦截转发到 loopback —— renderer 保持官方原版 dist、代码层面不见 127.0.0.1，carrier 全在 Electron（合规：Electron=IPC carrier+进程生命周期）；② 等 dsh-host-runtime 发布后走 InProcessApiClient 零端口方案。倾向 ① 作为 M2 主体，② 留给上游成熟后。

### Verification Needed

- 真实 Windows 桌面：无边框拖拽移动、双击最大化/还原、titleBarOverlay 按钮视觉与交互、Snap Assist、Aero Snap 四角吸附、窗口 resize 边缘
- 真 VM 干净安装（Setup 交互路径）
- M2 验收：Renderer 不依赖 `127.0.0.1`
- Linux/macOS 无边框表现

## Verification

| 项 | 状态 |
|---|---|
| Last arch:check | 2026-08-14 PASS（92 files） |
| Last tsc build | **2026-08-14 PASS**（frameless 改动，零错误） |
| Last dump-config | 2026-08-14 PASS |
| Last smoke suite | **2026-08-14 8 PASS / 0 FAIL / 1 SKIPPED** |
| Portable 离线 bootstrap（干净 DSH_HOME） | **2026-08-14 PASS**（模板复制 + web boot + HTTP 200） |
| Portable DSH_HOME 隔离 | **2026-08-14 PASS**（`<exe>/data/.dsh` 出现 profile） |
| Setup.exe 静默安装 | **2026-08-14 PASS**（`/S /D=<dir>` 装到临时目录，~2.5min，resources 完整含 template+node） |
| Setup 安装后启动冒烟 | **2026-08-14 PASS**（干净 DSH_HOME → 离线 bootstrap → web boot → marker PASS） |
| Setup 静默卸载 | **2026-08-14 PASS**（`Uninstall /S _?=<dir>`，无开始菜单/桌面残留；NSIS 自删外壳需补 rd，属正常行为） |
| Clean-machine test | PARTIAL（Portable 离线 + Setup 静默路径均已覆盖；真 VM 待做） |
| Frameless window 视觉验收 | **NOT VERIFIED**（需真实 Windows 桌面人眼验证拖拽/overlay/Snap） |
