# desktop-bundle [PLANNED]

`workbench-desktop` 是一个标准 DSH Bundle，叠加在默认 Workbench Profile 上，随安装包一起发行。

## 预期内容（均未实现，Bundle 具体格式以当前固定 DSH 版本官方文档为准）

- desktop 集成插件（Host + Client 两面），例如：
  - `native-settings`：开机启动、最小化到托盘、系统通知、更新通道 —— 通过官方 Settings slot 注册 UI，**可拆卸**
  - 托盘/单实例等 bootstrap 的插件面
- 依赖 `@dsh-workbench/native-provider` 提供的 provider

## 禁止

- 不得把设置界面写死进 Electron Shell 或官方 Client Shell
- 不得在此实现 Extension Center、IDE、Git UI、Agent Team（它们是独立插件/Bundle）
