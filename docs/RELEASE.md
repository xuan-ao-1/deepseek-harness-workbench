# Release

本文描述发布政策。**v0.1.1 已发布**（2026-08-15，见 GitHub Releases 与 STATUS.md）。

## 产物（M1 目标）

```text
DeepSeek-Harness-Workbench-x.y.z-Setup-x64.exe     （NSIS）
DeepSeek-Harness-Workbench-x.y.z-Portable-x64.exe
SHA256SUMS.txt
```

## 安装要求

- 当前用户安装，默认不需要管理员
- 自定义位置、开始菜单、桌面快捷方式、卸载程序
- 用户数据在 `~/.dsh`（Portable 例外 `<portable>/data/.dsh`），安装目录只存程序

## 发布门槛（硬性）

1. CI 全绿：架构守卫 + typecheck + profile boot + 插件/UI/subagent 测试
2. 安装包冒烟测试真实启动安装后的 Runtime（`build/smoke-tests` 全项通过）
3. `electron-builder 成功 ≠ 发布成功` —— 未跑冒烟不许 release
4. `UPSTREAM.md` / `STATUS.md` 已更新，DSH pin 与产物一致

## Update CI（工程规格书 §35）

```text
Check DSH upstream → new version → create PR → pnpm install → build
→ architecture tests → profile boot tests → plugin tests → UI tests
→ package → installer smoke test →（人工确认）→ release
```

不自动发布。

## 版本策略

每个 Workbench 版本固定一个经测试的 DSH 版本（ADR-004）。Developer Preview 期间禁止在用户机器上执行 `@latest` 更新。
