# AGENTS.md — DeepSeek Harness Workbench

本文件是所有执行 Agent 的入口。开始任何工作前，先完整阅读本文件与 `docs/AI_PROJECT_MEMORY.md`。

## 项目目标

```text
目标：

将官方 DeepSeek Harness 发行成一个 Windows 桌面应用，
而不是重新实现或 fork DeepSeek Harness。

必须最大程度复用 DeepSeek Harness 官方已有：

- Cordis
- Profile
- Bundle
- cordis.patch.yml
- Service / Provider / Consumer
- ctx.agents
- ctx.subagents
- WorkflowEngine
- Client Plugin
- UI Slot
- Conversation Node
- SDK JSON-RPC
- ACP
- dsh plugin

Electron 仅承担：

- 程序安装
- 窗口
- 进程生命周期
- IPC carrier
- 原生系统 bootstrap
- 自动更新

任何功能如果能够实现为 DSH/Cordis Plugin，
不得加入 Electron Core。

任何 UI 如果能够实现为 Client Plugin，
不得硬编码到 Workbench Shell。

任何插件组合使用官方 Bundle。

任何用户运行组合使用官方 Profile。

Extension Center 自身必须是可卸载插件，
它只负责社区插件发现和调用官方 dsh plugin 管理插件。

IDE 必须作为可选 Bundle 实现。

VS Code 支持不得修改 Harness Core；
优先支持 External VS Code Bridge，
内置 IDE 可采用独立实现并支持 Open VSX/VSIX。

Multi-Agent 必须基于 ctx.subagents + WorkflowEngine。

Codex、Claude Code 和未来其他 Agent
必须优先使用官方 CLI、SDK、ACP 或公开协议，
登录和订阅凭据继续由各自软件管理，
不得通过提取订阅 token 或建立反代来接管账号。

未来手机控制和多人协作不得提前创建平行框架。
优先复用官方 SDK、Agent、Session、Workspace、
Interaction 和 Event 能力；
只有出现真实 Provider + Consumer 需求时，
才按照官方 Capability Seam 规范新增 Service。

最终要求：

任何社区标准 DSH 插件，
不应因为运行在 Workbench 中而需要制作专用版本。

Workbench 的目标不是成为另一个 Harness，
而是成为官方 DeepSeek Harness 架构的桌面发行状态。
```

## 架构宪法（六条，违反任何一条即停）

1. **不 fork DeepSeek Harness Core**。优先级：官方 Service → Event → Client Slot → Cordis Plugin → Bundle/Profile patch → Host/Client Provider → 最后才 fork。
2. **绝对不创建 Workbench Plugin API**（`workbench.registerPlugin()` 等一律禁止）。插件作者写的是标准 DSH/Cordis Plugin。
3. **所有组合使用官方 Profile + Bundle**。禁止 `workbench-plugin.json` / `composition.json` / `workspace-recipe.json` 等平行格式。
4. **所有 UI 使用官方 Client Plugin / UI Slot / Conversation Node**。禁止 Workbench Panel/Dialog/Settings/Sidebar API。
5. **Agent 系统完全使用官方 `ctx.agents` / `ctx.subagents` / WorkflowEngine**。禁止 Workbench Agent Protocol。
6. **Electron 只负责桌面发行**：安装、窗口、进程生命周期、IPC carrier、托盘 bootstrap、单实例、更新、崩溃恢复、Native OS bootstrap。

CI 通过 `pnpm arch:check`（`build/scripts/check-architecture.mjs`）自动扫描禁止模式。

## 开始工作前的恢复流程

1. 阅读 `docs/AI_PROJECT_MEMORY.md`
2. 阅读 `docs/ARCHITECTURE.md`、`docs/STATUS.md`、`docs/DECISIONS.md`、`docs/UPSTREAM.md`
3. 检查仓库真实状态（package.json、lockfile、DSH pin、git log、未提交修改）
4. 涉及 DeepSeek Harness 时，按 `docs/UPSTREAM.md` 的清单阅读当前固定版本的官方文档，不得仅凭模型记忆修改代码

## 涉及官方 DeepSeek Harness 时必读的官方文件（按顺序）

```text
1.  README.md
2.  AGENTS.md
3.  docs/architecture.md
4.  docs/capability-seams.md
5.  docs/cookbook/extension-cookbook.md
6.  docs/user/develop/basic/publish.zh.md
7.  packages/README.md
8.  packages/client/AGENTS.md
9.  docs/config-catalog.md
10. docs/subsystems/extensions.md
11. .agents/notes/implemented/architecture/2026-07-19-gui-layering-and-rpc-protocol.md
```

（位于官方 DeepSeek Harness 仓库，非本仓库。）

## 完成工作后的文档维护义务

任何超过“极小修复”的工作，必须同步更新：

- `docs/STATUS.md`（当前状态快照）
- `docs/DECISIONS.md`（发生架构选择时，ADR 风格追加）
- `docs/UPSTREAM.md`（升级 DSH / 上游变化时）
- `docs/KNOWN_ISSUES.md`（新增问题时）

状态标签必须使用：`[IMPLEMENTED]` / `[IN PROGRESS]` / `[PLANNED]` / `[EXPERIMENTAL]` / `[DEFERRED]` / `[REMOVED]`。

未验证的事项一律写 `UNKNOWN / NOT VERIFIED`，禁止写“已完成”。

## 禁止事项（摘要）

```text
❌ 自己重新实现 Chat Session
❌ 自己重新实现 Tool Registry
❌ 自己重新实现 Model Provider
❌ 自己重新实现 Settings 系统
❌ 创建 Workbench Plugin SDK
❌ 创建 Workbench Agent Protocol
❌ 创建自己的 Plugin Profile 格式
❌ 把 IDE 写进 Electron main
❌ 把插件市场写进主 UI
❌ 修改 DSH 官方插件加载器
❌ 把 Codex/Claude 登录状态接管到 Workbench
❌ 把用户订阅 token 反代成 API
❌ 为不存在的未来需求提前创建十几个 Service
```

完整清单与处罚逻辑见 `docs/AI_PROJECT_MEMORY.md` §2（架构宪法）与原工程规格书。
