# fixtures [PLANNED]

官方 DSH 升级回归用测试插件，必须是**标准 DSH/Cordis Plugin**（正是为了验证"社区插件不改版也能跑在 Workbench"）。

计划：

```text
fixtures/
├─ host-plugin/     只注册 Host 面（service/contribution）
├─ client-plugin/   只注册 Client 面（UI slot / conversation node）
└─ dual-plugin/     Host + Client 双面
```

在每次升级官方 DSH 的 CI 流程（`docs/UPSTREAM.md`）与安装包冒烟测试中加载验证。实现前提：DSH pin 解析、官方插件格式按当版文档核对。
