# smoke-tests

冒烟测试的真实性要求（工程规格书 §34）：**`electron-builder 成功 ≠ 发布成功`**。CI 必须真正启动安装后的 Runtime。

## 检查清单（每次 DSH 升级与每次 release 前全部通过）

```text
[ ] Profile 能解析
[ ] DSH 能 boot（--dump-config）
[ ] Client 能启动
[ ] Session 能创建
[ ] 官方工具 inventory 存在
[ ] Profile plugin 能加载（host fixture）
[ ] Client plugin 能加载（client fixture）
[ ] Dual plugin 能加载
[ ] 安装后的 Runtime 能启动（installer smoke）
```

`smoke.mjs` 当前为诚实失败状态：架构守卫可运行，全部运行时检查因 DSH pin 未解析而 SKIPPED 并以非零码退出。

## fixtures

见仓库根 `fixtures/`：`host-plugin` / `client-plugin` / `dual-plugin` 三个标准 DSH 测试插件 [PLANNED]。
