# workbench Profile（模板说明）

默认 Profile 名：`workbench`，安装后目标位置 `~/.dsh/profiles/workbench`（`DSH_HOME` 默认 `~/.dsh`）。

## 逻辑层叠

```text
dsh-base
+ 官方 Web/Client 所需 Bundle
+ workbench-desktop
+ 用户安装的 Bundle
+ 用户 cordis.patch.yml
```

## 关键规则

1. **本目录不包含、也不得手写 Profile manifest。** Profile manifest（插件依赖、有序 Bundle 列表、`cordis.patch.yml`）由官方 `dsh plugin` 工具维护。本目录只存放模板说明与首次安装引导脚本 [PLANNED]。
2. Workbench 不创建 `~/.workbench/plugins` 之类的平行插件目录；用户在命令行执行 `dsh plugin` 与 Workbench 操作的是同一个生态。
3. Portable 模式例外：`DSH_HOME = <portable directory>/data/.dsh`（隔离需求，不改变 Profile 格式）。
4. `dsh-base` 提供的基础能力（模型 Adapter、工具、持久化、sandbox/approval、settings、credentials）不得被 Workbench 重新实现。

## 状态

[PLANNED] 首次运行引导（检测/创建 `workbench` Profile）将在 M1 实现，且必须通过官方 CLI/工具完成，不得绕开官方工具直接写 manifest。
