# Windows Installer [PLANNED]

## 产物

```text
DeepSeek-Harness-Workbench-x.y.z-Setup-x64.exe
DeepSeek-Harness-Workbench-x.y.z-Portable-x64.exe
SHA256SUMS.txt
```

## 要求（来自工程规格书 §33）

- NSIS（第一版）
- 当前用户安装，默认不要求管理员权限
- 自定义安装位置、开始菜单、桌面快捷方式、卸载程序
- 用户数据一律在 `~/.dsh`，不放安装目录；Portable 例外使用 `<portable>/data/.dsh`
- 安装目录只存：Electron Runtime、Workbench App、pinned DSH packages、pinned official client packages、workbench Profile 模板、native 集成包、licenses/notices

## 发布门槛

`electron-builder 成功 ≠ 发布成功`。打包后必须真实启动安装后的 Runtime 并通过 `build/smoke-tests` 全部检查，才允许 release。见 `docs/RELEASE.md`。
