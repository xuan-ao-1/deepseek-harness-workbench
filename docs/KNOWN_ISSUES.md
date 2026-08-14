# Known Issues

## KI-001 DSH 上游坐标未核实 [CLOSED 2026-08-14]

- 已解决：`@deepseek-ai/dsh@0.1.0-rc.6` 经 registry.npmjs.org 直查核实（官方 org、MIT、latest），exact pin 于 apps/electron。详见 `UPSTREAM.md`。

## KI-002 本机缺少 Node.js / pnpm [CLOSED 2026-08-14]

- 已解决：Node v24.19.0 + pnpm 11.21.0；用户 PATH 永久修复（`%LOCALAPPDATA%\pnpm\bin`）。

## KI-003 License 未确定 [OPEN]

- 官方 DSH 为 MIT（已核实，THIRD_PARTY_NOTICES.md 在官方仓库）；Workbench 自身 license 仍 TBD（根 package.json=UNLICENSED）
- M1 安装包须携带官方 THIRD_PARTY_NOTICES.md（licenses/notices 要求，规格书 §32）

## KI-004 GitHub 直连不稳定 [OPEN，环境问题]

- 现象：electron 二进制从 github.com 下载 ECONNRESET；2026-08-14 晚 raw.githubusercontent.com 也超时
- Workaround：electron 用 `ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/`（已验证）；官方文档抓取改走 `api.github.com` contents API（base64，已验证可用并缓存 %TEMP%/opencode/dsh-docs）
- 影响：CI/打包机需固化镜像/缓存策略，避免构建环境依赖 luck

## KI-005 pnpm 11 构建许可语义 [OPEN，注意事项]

- pnpm 11.21 不读 package.json 的 `pnpm.onlyBuiltDependencies`；正确字段为 workspace yaml 的 `allowBuilds` 布尔映射
- 每个官方 Profile 目录有独立 `pnpm-workspace.yaml`（dsh 生成），原生依赖（koffi/node-pty 等）需在该文件补 `allowBuilds: true`，否则 `dsh plugin add` 以非零退出
- 风险：官方升级若引入新的原生依赖，profile 内构建会再被拦截 → 升级流程需检查此项

## KI-006 dsh runtime 分发必须 `autoInstallPeers: true` [OPEN，关键发现]

- `dsh-app-boot`（及可能其他包）把 `cordis-plugin-group` 等声明为 **peerDependencies**
- 官方 profile 模板 `autoInstallPeers: false` 对 profile 目录是对的（那里只装插件，runtime 由 npx/npm 安装方提供）
- 但**打包 runtime staging 目录就是 runtime 本体**，必须 `autoInstallPeers: true`（prepare-runtime.mjs 已固化），否则 `dsh --version` 直接 ERR_MODULE_NOT_FOUND
- 升级 DSH 时需复验：`<staged node> <staged dsh>/lib/bin.js --version` 必须通过才可打包

## KI-007 首次运行无 Profile 会失败 [CLOSED 2026-08-14]

- 已解决：ADR-010 profile 模板随包分发 + 首启离线复制；Portable 隔离（ADR-003）同步落地；冒烟双场景 PASS（见 STATUS.md Verification）

## KI-009 Portable SFX 解压慢 + 冒烟进程残留 [OPEN，环境注意]

- Portable 单文件（167MB）每次启动解压 ~530MB 到 `%TEMP%`，本机（Defender 实时扫描）约 3-4 分钟才完成 —— 240s 冒烟超时因此误报 FAIL；冒烟超时已放宽到 600s（`PORTABLE_TIMEOUT_MS`）
- 曾因 killTree 用异步 spawn 未等待 → 进程残留占 single-instance lock → 后续实例静默退出且无 marker；已改同步 `spawnSync` + 按映像名 `taskkill /IM` 预清理 + `rmWithRetry`
- Electron main 现从 BOOT 阶段写 smoke marker（BOOT/READY/PASS/FAIL），锁冲突可观测
- 待观察：真实用户首启 3-4 分钟等待是否可接受（可考虑 NSIS 优先、Portable 加启动画面）

## KI-008 Windows 长路径删除 [OPEN，环境注意]

- `@mistralai/mistralai`（dsh 传递依赖）文件路径超 MAX_PATH；PowerShell `Remove-Item` 与 `cmd rd` 均失败
- 可靠清理：`robocopy <空目录> <目标> /MIR` 后 `rd`
- pnpm 抓取器在大并发下对该包组出现 `UND_ERR_DESTROYED`（staging .npmrc 已限 `network-concurrency=4` + `fetch-retries=5`）
