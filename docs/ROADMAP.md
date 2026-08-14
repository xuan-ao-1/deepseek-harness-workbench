# Roadmap

里程碑验收标准来自工程规格书 §36。

## Now（M0 — 官方架构验证）[COMPLETED 2026-08-14]

- [x] pnpm workspace 建立
- [x] 仓库骨架与文档集
- [x] 安装 Node.js ≥20 + pnpm（v24.19.0 / 11.21.0）
- [x] 核实官方 DSH 仓库/发布渠道，通读官方 README（`UPSTREAM.md` 清单其余项 M1 前补齐）
- [x] 锁定 DSH version（exact pin `@deepseek-ai/dsh@0.1.0-rc.6`）
- [x] 用官方工具创建 workbench Profile（`dsh plugin --profile workbench add`），跑通 `--dump-config`
- 验收：**未修改官方 Harness 源码（零 fork）** ✓

## Next

### M1 — Windows Desktop [IN PROGRESS，核心链路 + 首启 bootstrap 已通]

- [x] bundled DSH + bundled node.exe（extraResources，ADR-009）
- [x] Electron 启动 `dsh --profile workbench --port 0`（随机 loopback）→ 官方 Web UI
- [x] NSIS/Portable 安装包 + SHA256SUMS
- [x] 打包后冒烟：Portable 真实启动 PASS
- [x] 首次运行自动创建 workbench Profile（ADR-010 模板离线复制，KI-007 已关闭）
- [x] Portable `DSH_HOME` 隔离（ADR-003 已落地并冒烟验证）
- [ ] 干净机器（无 Node / 无 ~/.dsh）验证（Portable 离线路径已冒烟覆盖；Setup.exe 安装流程待 VM）
- 验收：一台没有 Node 的 Windows 电脑可以直接安装运行。

### M2 — Official Electron Carrier

IPC carrier、移除默认 localhost 服务、Native DirectoryPicker Provider。
验收：Renderer 不依赖 `127.0.0.1`。

### M3 — Extension Center

`dsh-workbench-extension-center`（独立插件）：搜索（GitHub `dsh-plugin` topic / npm / Git URL / 本地目录）、安装/卸载/更新/禁用、Profile 管理；真正安装调用官方 `dsh plugin`；卸载区分"仅卸载"与"彻底删除数据"（默认保留数据）。
验收：Extension Center 卸载后 Workbench 仍然正常。

## Later

### M4 — Coding Integration

Workspace / Terminal / LSP / Git / Diff / Review，尽量用现有 DSH capability；禁止巨型 IDE Core。

### M5 — VS Code

先 External VS Code Bridge；再 `dsh-workbench-ide`（Embedded，可用 Theia；Open VSX / VSIX 由 IDE Bundle 自管，与 DSH Plugin 生态分离）。

### M6 — Multi Agent

Agent Team UI（Client Plugin）+ Workflow + `ctx.subagents` + Codex / Claude Code / ACP。禁止自建 Agent protocol；外部 Agent 实现为官方模式下的 Subagent Provider，认证由其自身管理。

## Exploration（只记录需求，不创建任何平行框架/API）

- M7 — Remote / Mobile：复用官方 SDK JSON-RPC / ACP / sessions / events / interaction
- Collaboration：真实 Provider + Consumer 出现前不设计接口
- 社区插件 catalog、`dsh-project-maintainer` 文档辅助脚本
