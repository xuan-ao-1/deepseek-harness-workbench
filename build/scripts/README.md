# build/scripts

## check-architecture.mjs

自动化架构守卫（工程规格书 §37）。零依赖，纯 Node，`pnpm arch:check` 或 `node build/scripts/check-architecture.mjs` 运行，进入 CI。

| 规则 | 对应原则 | 检查内容 |
|---|---|---|
| P1 | 不 fork Core | `packages/` 下禁止出现 `@deepseek-ai/**`（vendor/patch 官方包） |
| P2 | 不创建 Workbench Plugin API | 代码中禁止 `workbench.registerPlugin/Panel/Tool/Agent(` |
| P3 | 官方 Profile + Bundle | 禁止 `workbench-plugin.json` / `composition.json` / `workspace-recipe.json` 文件 |
| P6 | Electron 只负责发行 | `apps/electron/main/` 下禁止 git/ide/agent-team/extension-center/marketplace/collaboration 模块目录 |
| P7 | 不创建私有 RPC | 代码中禁止 `workbench.invoke(` |

只扫描 `apps/`、`packages/`、`fixtures/` 的代码文件；`docs/`（允许在散文中引用禁止模式作为反例）与 `node_modules/dist/out/release` 跳过。

规则调整需先在 `docs/DECISIONS.md` 登记 ADR。
