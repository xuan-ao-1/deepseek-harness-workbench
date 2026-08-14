# DeepSeek Harness Upstream Tracking

## Current Pin

| 项 | 值 |
|---|---|
| Package/version | `@deepseek-ai/dsh@0.1.0-rc.6`（exact，apps/electron dependency；rc.6 为 npm `latest`，2026-08-13 发布） |
| Commit/tag | npm 包（无对应 tag 记录）；repo: `github.com/deepseek-ai/deepseek-harness`，包内目录 `apps/cli` |
| Pinned on | 2026-08-14 |
| 验证方式 | registry.npmjs.org 元数据直查（maintainers: imccyu, tianyi@deepseek.com；rc.6 起 publishConfig.access=public；MIT） |
| 关键官方包（同版本线） | `@deepseek-ai/cordis@^4.0.1`、`dsh-base`、`dsh-web-app`、`dsh-host-apiproxy`、`dsh-host-webserver`、`dsh-cordis-client-runner`、`dsh-subagent`、`dsh-tool-subagent(-control)`、`dsh-tool-workflow`、`dsh-host-directory-picker-auto` 等 |

## Latest Reviewed Upstream

| 项 | 值 |
|---|---|
| Version | 0.1.0-rc.6（即当前 pin） |
| Reviewed on | 2026-08-14 |
| 结论 | 官方 README 证实 Developer Preview："THERE WILL BE COMPATIBILITY-BREAKING CHANGES"；`npx @deepseek-ai/dsh web` 默认 `http://127.0.0.1:3080` |

## Compatibility（基于 2026-08-14 实测）

| 项 | 状态 |
|---|---|
| Host runtime | [IMPLEMENTED] dump-config 组合树正常（490 行） |
| Client runtime | [PLANNED] web-app bundle 已装入 profile；浏览器 UI 未实测 |
| Profile | [IMPLEMENTED] `~/.dsh/profiles/<name>`，manifest=package.json `dsh.profile.bundles`（有序），由 `dsh plugin` 维护 |
| Bundle | [IMPLEMENTED] layering 实证：`# == dsh-base, patched by dsh-web-app` |
| Plugin loading | [PARTIAL] `dsh plugin add` 幂等可用（转发 pnpm 到 profile 目录）；fixtures 未建 |
| Subagents | UNKNOWN（未实测，依赖树含 dsh-subagent / dsh-tool-subagent*） |
| Workflow | UNKNOWN（依赖树含 dsh-tool-workflow / dsh-workflow-worker-thread） |
| SDK | UNKNOWN |
| ACP | UNKNOWN |

## Required Official Reading（工程规格书 §39，按顺序）

- [x] 1. README.md（2026-08-14，raw.githubusercontent master 分支）
- [x] 2. AGENTS.md（2026-08-14，经 api.github.com 缓存至 %TEMP%/opencode/dsh-docs）
- [x] 3. docs/architecture.md（2026-08-14，同上）
- [x] 4. docs/capability-seams.md（2026-08-14，生成版 capability 图，作查阅目录）
- [x] 5. docs/cookbook/extension-cookbook.md（2026-08-14）
- [x] 6. docs/user/develop/basic/publish.zh.md（2026-08-14）
- [x] 7. packages/README.md（2026-08-14）
- [x] 8. packages/client/AGENTS.md（2026-08-14）
- [x] 9. docs/config-catalog.md（2026-08-14，头部 + 结构确认：生成版配置目录，3151 行，按包查阅）
- [x] 10. docs/subsystems/extensions.md（2026-08-14）
- [x] 11. .agents/notes/implemented/architecture/2026-07-19-gui-layering-and-rpc-protocol.md（2026-08-14）

（注：官方仓库默认分支为 `master`；`main` 返回 404。raw.githubusercontent.com 2026-08-14 晚间超时，改走 api.github.com contents API 成功。）

### 阅读结论（对 Workbench 有直接影响的 FACTS）

- **M2 Electron carrier 是官方预留路径**（GUI layering note）：四象限 RPC 消息模型与物理 carrier 解耦；新客户端 = 子类化 `AbstractApiClient` 仅实现 `doFetch`（"IPC bridge subclass … an Electron shell" 官方明文示例）。协议不变量全在基类；`onEnvelope` 是官方指定的 wire 诊断挂点。
- **`dsh-host-webserver` 官方明文 "Electron does not reuse it"** —— M2 移除 localhost 服务符合官方分层。`InProcessApiClient`（注入 `{ fetch }` handler，零端口跑真实 wire 序列化/zod/SSE）是官方同构测试点，M2 可优先评估。
- **新应用集成清单（官方）**：选 fetch 承载 → 在 `apps/` 写 assembly 模块（`startHost()` + client 子类）→ 仅需 HTTP 才 import webserver。
- **Profile 层序**（publish.zh.md）：bundles（列表序）→ profile `cordis.patch.yml` → **home 级 `$DSH_HOME/cordis.patch.yml`（跨 profile 共享的机器本地偏好）** → `--patch`。Workbench 不得覆盖/吞掉 home 级 patch；patch 替换整行 config 而非深合并。
- **profile manifest 永远不手写**（`dsh plugin` 维护）—— ADR-010 模板由官方命令生成与此一致；升级/加 bundle 也必须走 `dsh plugin`。
- **git 安装的构建授权**（publish.zh.md）：git 依赖需 `prepare` 脚本 + 用户 profile `pnpm-workspace.yaml` 的 `allowBuilds` 授权（= 允许安装时代码执行）；npm 发布/tarball 无需授权 —— M3 Extension Center 的插件分发引导应优先 registry/tarball，git 源需提示授权风险并建议锁 commit。
- **官方 rc 姿态**（AGENTS.md "Pre-release stance"）：首个 tag 前随意 rename/repackage、后端拒绝旧磁盘格式 —— 证实 ADR-004 exact pin 与固定升级流程的必要性。
- **extensions 子系统**：`ctx.dynamicCordisRunner`（动态插件生命周期，`@Remote` 方法可被 Client 调用）+ `ctx.cordisInspect`（跨端只读查询注册表）—— M3+ 涉及"agent 自改插件"时应走这些官方 seam。
- **client 插件纪律**：UI 组合唯一 API 是 `ctx.slots.register`；跨包值引用禁止（值协作走 cordis 服务）；新 client 插件需三处注册面（tsconfig 引用 + web-app cordis.patch.yml 行 + 依赖声明）。

## 实测命令备忘（2026-08-14）

```text
dsh --version                          → 0.1.0-rc.6
dsh --help                             → --profile/--patch/--dump-config/web/plugin
dsh plugin --profile X add <pkg>       → 创建/维护 profile（转发 pnpm）
dsh --profile web --dump-config        → 首次运行自动生成 web profile
dsh --profile workbench --dump-config  → exit=0（M0 验收）
dsh web --help                         → --host/--port/--trusted-host；--port 0 = OS 随机空闲端口
```

M1 Phase 0 启动形态（官方参数即满足规格书 §8）：`dsh --profile workbench web --host 127.0.0.1 --port 0`。

## Breaking Changes

（暂无记录）

### Change 模板

```text
Upstream:
Impact:
Workbench adaptation:
Compatibility code:
Removal condition:
```

## Pending Upstream Issues

- Developer Preview：升级必须走固定流程（AI_PROJECT_MEMORY §19），禁止 `pnpm update` 即视为升级
- Profile 目录内 pnpm 构建：`allowBuilds` 需在 profile 自己的 `pnpm-workspace.yaml` 里配置（dsh 生成骨架，允许原生包构建需手工补 true）

## 升级固定流程（摘要）

见 `AI_PROJECT_MEMORY.md` §19（十六步）。核心：记录当前 pin → 读新版官方文档与 changelog → 更新依赖 → `--dump-config` → profile boot / host plugin / client plugin / session / tool inventory / subagent / extension center 测试 → 打包 → 安装包冒烟 → 更新本文件与 `STATUS.md` → 必要时补 ADR。**禁止** `pnpm update && git commit` 即视为升级完成。
