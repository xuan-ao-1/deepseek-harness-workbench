# Plugin Guide

## 一句话

**开发标准 DeepSeek Harness / Cordis Plugin，而不是 "Workbench Plugin"。Workbench Plugin 这种东西不存在，也永远不应存在。**

## 兼容性判据

> 你的插件在 `dsh web` 下能用 → 它在 Workbench 下就能用，无需制作专版。

Workbench 只是官方架构的桌面发行状态：官方 Cordis、Profile、Bundle、`cordis.patch.yml`、Service/Provider/Consumer、Client Plugin、UI Slot、Conversation Node 原样可用。

## 规则

1. **组合**：通过官方 Profile / Bundle / `dsh plugin` 安装，不存在 `workbench-plugin.json` 之类的格式。
2. **UI**：使用官方 Client Plugin 机制（`ctx.slots.register(...)`、Conversation Node）。设置页、侧栏项、对话节点都是注册出来的，卸载即消失。
3. **Host 面**：依赖抽象 capability/service，不依赖具体 Provider（这是 FS/Subprocess/Sandbox 可替换的基础）。
4. **原生前力**：不要 `window.electron.*` 直连 Electron；走官方 seam（如 `DirectoryPicker`）。
5. **数据**：用户生态在 `~/.dsh`；插件数据生命周期由官方工具管理，卸载默认保留数据。
6. **发现**：插件仓库建议加 `dsh-plugin` GitHub topic；未来 Extension Center 只是发现 + 调用 `dsh plugin` 的前端，支持 npm / GitHub / Git URL / Local / `file:` / `link:`。

## 测试

`fixtures/`（host/client/dual 三个标准测试插件 [PLANNED]）在每次官方 DSH 升级 CI 中加载，验证 Workbench 不破坏标准插件兼容性。开发自己的插件时，同样以"在官方 `dsh web` 下可运行"为验收基准。
