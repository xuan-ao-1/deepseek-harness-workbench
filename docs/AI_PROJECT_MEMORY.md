# DeepSeek Harness Workbench — AI 持久上下文与文档维护协议

> 建议位置：`docs/AI_PROJECT_MEMORY.md`
>
> 本文件不是普通说明文档，而是本项目所有 AI Agent 的“长期项目记忆入口”。任何 AI 在开始开发、重构、升级、打包、修复或设计新插件前，必须先阅读本文件以及本文指定的其他文档。
>
> 目标：即使聊天上下文被截断、模型切换、Agent 更换、任务跨多天继续，本项目的架构原则、当前状态、决策、风险和下一步工作也不能丢失。

---

## 1. 项目一句话定义

**DeepSeek Harness Workbench 是 DeepSeek Harness 官方架构的桌面发行状态，而不是新的 Harness、插件框架、Agent 框架或 IDE 框架。**

Workbench 负责把官方 DeepSeek Harness 发行成可直接安装的桌面应用，并尽可能保持官方：

- Cordis
- Profile
- Bundle
- `cordis.patch.yml`
- Service / Provider / Consumer
- Client Plugin
- UI Slot
- Conversation Node
- `ctx.agents`
- `ctx.subagents`
- WorkflowEngine
- SDK JSON-RPC
- ACP
- `dsh plugin`

等架构原样可用。

---

## 2. 架构宪法

任何 Agent 修改项目之前都必须检查以下规则。

### 2.1 不 Fork Harness Core

原则上不得修改官方 DeepSeek Harness Core。

优先级必须为：

1. 使用官方已有 Service
2. 使用官方已有 Event / Hook
3. 使用官方 Client Slot
4. 编写 Cordis Plugin
5. 编写 Bundle / Profile Patch
6. 编写 Service Provider
7. 编写 Client Plugin
8. 最后才考虑 upstream patch / fork

如果确实必须修改上游：

- 必须记录原因；
- 必须创建独立 patch；
- 必须说明为什么官方 extension seam 无法解决；
- 必须在 `docs/UPSTREAM_PATCHES.md` 中登记；
- 后续官方提供正式接口后优先移除 patch。

### 2.2 不创建 Workbench Plugin API

禁止创建：

```ts
workbench.registerPlugin()
workbench.registerPanel()
workbench.registerTool()
workbench.registerAgent()
```

Workbench 插件原则上就是标准 DeepSeek Harness / Cordis Plugin。

目标：

> 一个标准社区 DSH 插件，不应该因为运行在 Workbench 中而需要制作 Workbench 专版。

### 2.3 所有组合使用官方 Profile + Bundle

不得创建平行的运行时插件组合格式。

运行时组合使用：

- DSH Profile
- DSH Bundle
- `cordis.patch.yml`
- Home Patch
- CLI Patch

Preset 只能是 Profile Template，不得形成封闭格式。

### 2.4 UI 必须使用官方 Client Plugin 架构

设置、侧栏、对话框、聊天节点、IDE、Git、插件中心、Agent 面板等 UI 不得直接写死在 Electron Shell。

优先使用：

```ts
ctx.slots.register(...)
```

以及官方 Client Plugin / Conversation Node 机制。

### 2.5 Agent 必须使用官方 Agent/Subagent/Workflow 架构

不得创建 Workbench Multi-Agent Runtime。

多 Agent 使用：

- `ctx.agents`
- `ctx.subagents`
- WorkflowEngine
- 官方/标准 Subagent Provider
- ACP
- SDK JSON-RPC

Codex、Claude Code、其他 Agent 软件优先通过：

- 官方 CLI
- 官方 SDK
- ACP
- MCP
- 公开文档协议

进行控制。

不得通过提取订阅 OAuth Token、Cookie、账号池、伪装官方客户端或把订阅凭据反代为通用 API 的方式接入。

### 2.6 Electron 只负责桌面发行

Electron Core 只负责：

- BrowserWindow
- 应用生命周期
- 单实例
- IPC Carrier
- 安装/卸载
- 自动更新
- 崩溃恢复
- 托盘 bootstrap
- 必要的 Native Provider bootstrap

如果某个功能可以成为 DSH Plugin / Client Plugin，则不得进入 Electron Core。

---

## 3. 当前目标架构

项目长期保持三层：

```text
Electron Application
        │
        │ IPC / transport
        ▼
DSH Profile / Bundle Composition
        │
        ▼
Official DeepSeek Harness
├─ Host Cordis Runtime
└─ Client Cordis Runtime
```

不要在这三层之间增加新的 Workbench Runtime、Capability Bus、Agent Fabric 或插件运行时。

---

## 4. Workbench 本身允许维护的内容

Workbench 仓库原则上只维护：

```text
apps/
└─ electron/

packages/
├─ electron-carrier/
├─ native-provider/
└─ desktop-bundle/

profiles/
└─ workbench/

build/
docs/
```

以下功能原则上应该独立为插件或独立 package：

- Extension Center
- IDE
- VS Code Bridge
- Git UI
- Review UI
- Multi-Agent Team
- Collaboration
- Remote / Mobile
- Browser
- Memory
- Research
- Office document integration

不要把项目逐步膨胀成大型 monorepo。

---

## 5. AI 每次开始工作前必须执行的恢复流程

任何新 Agent、上下文恢复后的 Agent、重新接手项目的 Agent，必须按以下顺序执行。

### Step 1：阅读持久上下文

必须阅读：

1. `docs/AI_PROJECT_MEMORY.md`
2. `docs/ARCHITECTURE.md`
3. `docs/STATUS.md`
4. `docs/DECISIONS.md`
5. `docs/UPSTREAM.md`
6. `docs/ROADMAP.md`
7. `docs/KNOWN_ISSUES.md`

如果某个文件不存在，应在不改变现有架构的前提下创建。

### Step 2：读取项目实际状态

必须检查：

- `package.json`
- `pnpm-lock.yaml`
- 当前 DSH 固定版本
- 当前 Profile
- 当前 Bundle
- 最近 Git commit
- 未提交修改
- CI 状态
- 当前构建是否能通过

不得仅根据文档猜测代码状态。

### Step 3：核对上游变化

涉及 DeepSeek Harness 升级、架构、插件 API、Client API、Agent/Subagent API 时：

- 阅读当前固定版本对应官方文档；
- 阅读最新上游文档；
- 比较 breaking change；
- 不得仅凭模型记忆修改代码。

### Step 4：确认当前任务属于哪一类

分类：

- Desktop release
- Upstream integration
- DSH Plugin
- Client Plugin
- Bundle/Profile
- IDE integration
- Extension Center
- Multi-Agent
- Remote
- Collaboration
- Build/Installer
- Security
- Documentation

确认后再修改。

---

## 6. AI 每次完成工作后必须执行的文档维护流程

任何超过“极小修复”的工作完成后，都必须同步更新项目文档。

### 必须更新 `docs/STATUS.md`

记录：

- 当前完成到哪里；
- 当前可以运行什么；
- 当前不能运行什么；
- 最近一次验证时间；
- 当前上游 DSH 版本；
- 当前 Workbench 版本；
- 下一步最合理的任务。

### 发生架构选择时更新 `docs/DECISIONS.md`

使用 ADR 风格：

```text
## ADR-00X：标题

日期：
状态：Accepted / Replaced / Deprecated

背景：

决定：

原因：

替代方案：

后果：

官方架构对应：
```

特别是以下决策必须记录：

- 是否新增 Service
- 是否新增 Provider
- 是否新增 Client Slot
- 是否引入第三方运行时
- 是否修改 Electron Core
- 是否打 upstream patch
- 是否改变 Profile/Bundle layering
- 是否改变 DSH 版本策略

### 上游变化更新 `docs/UPSTREAM.md`

记录：

```text
Current pinned DSH:
Upstream latest checked:
Last reviewed:
Known breaking changes:
Required adaptations:
Removed compatibility code:
```

### 有新增问题更新 `docs/KNOWN_ISSUES.md`

不要只把问题留在聊天里。

---

## 7. 文档层级

建议维护以下文件。

### `docs/AI_PROJECT_MEMORY.md`

本文件。

负责：

- 项目总原则
- AI 接手规则
- 文档维护协议
- 防止上下文丢失

**不要频繁重写。**

### `docs/ARCHITECTURE.md`

描述当前真实架构。

只写“现在实际采用什么”，不要混入大量未来设想。

### `docs/STATUS.md`

当前状态快照。

应该非常容易让新 Agent 在 2 分钟内知道项目做到哪里。

### `docs/ROADMAP.md`

未来计划。

按照：

```text
Now
Next
Later
Exploration
```

维护。

### `docs/DECISIONS.md`

架构决策日志。

只追加，不随意删除历史决策。

### `docs/UPSTREAM.md`

DeepSeek Harness 上游版本、兼容性、升级记录。

### `docs/KNOWN_ISSUES.md`

已知问题、暂时 workaround、风险。

### `docs/RELEASE.md`

Windows Installer、Portable、CI、Smoke Test、发布说明。

### `docs/PLUGIN_GUIDE.md`

如何开发与 Workbench 兼容的插件。

原则上应告诉开发者：

> 开发标准 DSH Plugin，而不是 Workbench Plugin。

---

## 8. `STATUS.md` 推荐格式

每次重要任务完成后刷新：

```markdown
# Project Status

Last updated:
Updated by:

## Current Versions

Workbench:
DeepSeek Harness:
Electron:
Node runtime:

## Working

- [x] ...
- [x] ...

## Partial

- [ ] ...

## Broken / Blocked

- ...

## Current Architecture

一句话说明当前运行路径。

## Current Profile

Profile:
Bundles:
Important patches:

## Recent Changes

- ...
- ...

## Immediate Next Tasks

1.
2.
3.

## Verification

Last smoke test:
Last installer test:
Last clean-machine test:
```

---

## 9. `UPSTREAM.md` 推荐格式

```markdown
# DeepSeek Harness Upstream Tracking

## Current Pin

Package/version:
Commit/tag:
Pinned on:

## Latest Reviewed Upstream

Version:
Commit:
Reviewed on:

## Compatibility

Host runtime:
Client runtime:
Profile:
Bundle:
Plugin loading:
Subagents:
Workflow:
SDK:
ACP:

## Breaking Changes

### Change X

Upstream:
Impact:
Workbench adaptation:
Compatibility code:
Removal condition:

## Pending Upstream Issues

- ...
```

---

## 10. `DECISIONS.md` 的目标

聊天上下文可能消失，但项目为什么这样设计不能消失。

例如：

```markdown
## ADR-001：不创建 Workbench Plugin API

状态：Accepted

决定：
Workbench 只使用 DeepSeek Harness / Cordis Plugin。

原因：
避免形成第二套生态，保持社区插件直接兼容。

后果：
Workbench-specific features 必须尽量实现为标准 DSH Host/Client Plugin。
```

再例如：

```markdown
## ADR-002：Electron 只作为 Application Carrier

决定：
Electron Renderer 与 Host Runtime 通过官方逻辑协议的 IPC carrier 通讯。

禁止：
创建 Workbench 私有 Agent RPC。
```

---

## 11. “未来设想”与“已经实现”必须严格区分

所有文档使用以下标签：

```text
[IMPLEMENTED]
[IN PROGRESS]
[PLANNED]
[EXPERIMENTAL]
[DEFERRED]
[REMOVED]
```

禁止把“未来可能支持手机、多 Agent、多人办公”写成已经存在的功能。

---

## 12. 对未来功能的处理规则

### IDE

目标：

- 可选 DSH Bundle；
- 不进入 Electron Core；
- 优先 External VS Code Bridge；
- Embedded IDE 可作为后续 Client Plugin/Bundle；
- VS Code extension 生态与 DSH Plugin 生态保持分离。

### Extension Center

必须是可卸载插件。

负责：

- 搜索社区 DSH Plugin
- npm / GitHub / Git / Local
- 安装
- 删除
- 更新
- Profile 管理

真正安装优先调用官方 `dsh plugin`。

### Multi-Agent

使用：

```text
ctx.subagents
WorkflowEngine
```

不得建立第二套 Agent 编排协议。

### 外部 Agent 软件

使用官方 CLI / SDK / ACP / documented protocol。

认证由外部产品自己维护。

### Mobile / Remote

现在只记录需求，不提前创建 Workbench Remote API。

开发时先检查官方：

- SDK JSON-RPC
- ACP
- Agent
- Session
- Event
- Interaction

是否足够。

### Collaboration

现在不提前创建：

```text
collaboration.provider
presence.provider
identity.provider
```

真正开发时遵循官方原则：

> Service Definition + Provider + Consumer 同时出现时再创建新的 capability seam。

---

## 13. 动态 Extension 与持久插件必须区分

持久插件：

```text
DSH Profile
+ Bundle
+ dsh plugin
```

Agent 临时生成的运行时 Extension：

```text
dynamicCordisRunner
```

不得混用两套生命周期。

---

## 14. 上下文有限时的压缩规则

如果 Agent 即将达到上下文限制，不要只输出聊天总结。

必须先把关键状态写回仓库文档。

优先级：

1. `STATUS.md`
2. `DECISIONS.md`
3. `KNOWN_ISSUES.md`
4. `UPSTREAM.md`
5. 当前任务相关文档

然后在下一次 Agent 会话中通过这些文件恢复。

### 必须持久化的内容

- 当前正在修改哪些文件；
- 为什么修改；
- 已完成什么；
- 尚未完成什么；
- 测试结果；
- 当前报错；
- 关键设计决定；
- 上游兼容问题；
- 下一步建议。

### 不必持久化

- 大量临时思考；
- 已被否决且无长期价值的尝试；
- 重复日志；
- 普通命令输出。

---

## 15. 每个开发任务建议建立 Task Note

复杂任务可以临时建立：

```text
docs/tasks/YYYY-MM-DD-short-task-name.md
```

格式：

```markdown
# Task

## Goal

## Related Architecture

## Files

## Current Progress

## Findings

## Decisions

## Tests

## Remaining

## Handoff
```

完成后：

- 重要决定迁入 `DECISIONS.md`
- 状态迁入 `STATUS.md`
- Task Note 可保留作为历史记录

这样大型任务跨多个 Agent 时不会丢失。

---

## 16. AI 不得只更新代码不更新文档的场景

以下情况必须同步维护文档：

- 升级 DSH
- 改 Profile
- 改 Bundle
- 新增 Plugin
- 新增 Client Plugin
- 新增 Service Provider
- 修改 IPC / transport
- 修改 installer
- 修改 runtime
- 引入 IDE
- 引入 VS Code integration
- 新增外部 Agent Provider
- 修改安全模型
- 引入新的第三方核心依赖
- 产生新的已知兼容问题

---

## 17. AI 不得为了“文档完整”制造虚假状态

如果不知道：

```text
当前 Installer 是否通过 clean machine 测试
```

必须写：

```text
UNKNOWN / NOT VERIFIED
```

不得写“已完成”。

如果文档和代码冲突：

> 以代码与实际测试结果为准，并立即修正文档。

---

## 18. 推荐的 Git 工作方式

重要开发任务：

1. 创建分支
2. 修改代码
3. 更新 Task Note
4. 测试
5. 更新 STATUS
6. 如果产生架构决定，更新 DECISIONS
7. 如果涉及上游，更新 UPSTREAM
8. Commit

Commit message 应尽量体现功能，而不是：

```text
update
fix things
```

---

## 19. 每次升级 DeepSeek Harness 的固定流程

1. 记录当前 DSH pin。
2. 阅读新版官方文档。
3. 阅读 changelog / commit diff。
4. 更新依赖。
5. 运行 `--dump-config`。
6. Profile boot test。
7. Host plugin test。
8. Client plugin test。
9. Session test。
10. Tool inventory test。
11. Subagent test。
12. Extension Center test。
13. 打包。
14. 安装包 smoke test。
15. 更新 `UPSTREAM.md`。
16. 更新 `STATUS.md`。
17. 必要时增加 ADR。

不得直接：

```text
pnpm update
git commit
```

然后认为升级完成。

---

## 20. 文档自动维护建议

以后可以增加一个普通开发辅助插件或脚本：

```text
dsh-project-maintainer
```

用途：

- 检查 STATUS 是否过期；
- 检查 DSH pin 是否与 UPSTREAM 文档一致；
- 检查新 Service 是否有 ADR；
- 检查重要代码改动后是否更新文档；
- 在任务结束时提示 Agent 写 Handoff；
- 自动生成文档更新建议。

它只是开发辅助，不是 Workbench Core。

---

## 21. AI Handoff 标准

任何 Agent 无法继续、任务中断、需要换 Agent 时，必须在 `STATUS.md` 或 Task Note 中留下：

```markdown
## Handoff

### Goal

### Completed

### Current Files

### Current Problem

### Important Findings

### Do Not Change

### Next Action

### Verification Needed
```

下一 Agent 禁止从头猜。

---

## 22. Definition of Done

一个功能不因“代码写完”而完成。

必须同时满足：

- [ ] 代码完成
- [ ] 架构规则未违反
- [ ] 测试完成
- [ ] STATUS 更新
- [ ] 必要 ADR 更新
- [ ] 必要 UPSTREAM 更新
- [ ] Known Issues 更新
- [ ] 无关键上下文只存在于聊天中

---

## 23. 最终原则

本项目必须做到：

> **聊天上下文可以消失，但项目知识不能消失。**

AI 的记忆来源优先级应为：

```text
Repository
↓
Official DeepSeek Harness documentation
↓
Current code
↓
Tests
↓
Git history
↓
Conversation context
```

不要反过来依赖聊天历史作为项目唯一真相。

---

# 给任何新 AI Agent 的开场指令

如果你是刚接手本项目的 AI：

1. 不要立即写代码。
2. 先阅读 `docs/AI_PROJECT_MEMORY.md`。
3. 再阅读 `ARCHITECTURE.md`、`STATUS.md`、`DECISIONS.md`、`UPSTREAM.md`。
4. 检查仓库真实状态。
5. 涉及 DeepSeek Harness 时重新阅读对应版本官方文档。
6. 遵循官方 Profile / Bundle / Cordis / Client Plugin / Subagent / SDK 机制。
7. 不创造新的 Workbench 插件体系。
8. 完成工作后同步维护项目文档。
9. 在上下文耗尽前写 Handoff。
10. 永远把 Workbench 当作 DeepSeek Harness 官方架构的发行状态，而不是第二套平台。
