# electron-carrier [PLANNED]

官方 GUI 协议与物理 carrier 解耦：Browser Client 走 HTTP/WebSocket，Electron Client 走 IPC/in-process。本包只实现**传输层**，把官方 Host Runtime 与官方 Client（ApiProxy）之间的既有 RPC message 经 Electron IPC 传递。

## 必须遵守

- 只转发官方 RPC message，不定义任何 Workbench 私有动词（禁止 `workbench.invoke("...")` 之类）
- carrier 更换（loopback → IPC → in-process）不得导致 Renderer 代码变化
- 协议细节以当前固定 DSH 版本的官方文档为准（`docs/UPSTREAM.md` 阅读清单），不得凭记忆实现

## 里程碑

- M1 之前：不存在（Phase 0 使用 `dsh web` loopback）
- M2：实现 IPC carrier，验收标准为 Renderer 不依赖 `127.0.0.1`
