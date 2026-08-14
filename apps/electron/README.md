# apps/electron

Electron Application 层。只允许承担：窗口、进程生命周期、单实例、IPC carrier bootstrap、托盘 bootstrap、更新、崩溃恢复、Native OS bootstrap。

## 当前实现状态

- [IMPLEMENTED] 最小主进程骨架：单实例锁、BrowserWindow 创建、Phase 0 目标解析
- [IMPLEMENTED] Phase 0 兼容启动（仅环境变量 `WORKBENCH_PHASE0_URL` → loadURL）
- [PLANNED] M1：随包分发并启动官方 `dsh web`（随机 loopback port）
- [PLANNED] M2：官方 ApiProxy over Electron IPC carrier（`packages/electron-carrier`），移除默认 localhost 服务
- [PLANNED] 托盘、自动更新、崩溃恢复

## 禁止

禁止在本层实现任何业务功能（Git/IDE/Agent Team/插件市场/设置 UI 等）。架构守卫脚本会扫描 `main/` 下的违规模块目录名。
