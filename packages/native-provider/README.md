# native-provider [PLANNED]

原生系统能力以官方 **Provider** 形式暴露，绝不创建 `window.electron.openDirectory()` 这类让插件直接依赖 Electron 的旁路 API。

## 规则

1. 官方已存在抽象 seam（如配置目录中的 `DirectoryPicker`，native/auto 实现）→ 优先接入官方 seam，Workbench 只提供 desktop provider 实现。
2. 官方暂无 seam → 只有当 **Service Definition + Provider + Consumer 三者同时真实存在**时，才按官方 Capability Seam 规范新增一个 Cordis service。
3. 禁止提前为未来需求定义几十个 API（通知、剪贴板、OS open 等待真实消费方出现再说）。

## 候选（仅记录，均未实现）

- DirectoryPicker desktop provider（M2，随 IPC carrier 一起）
- 系统通知 / 开机启动 / 托盘交互（作为 desktop-bundle 内插件的实现细节）
