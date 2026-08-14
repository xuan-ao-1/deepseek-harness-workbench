# preload

Phase 0 刻意保持为空。

按架构原则：Renderer 与 Host 的通信必须走官方 ApiProxy 的逻辑协议（未来由 `packages/electron-carrier` 提供 IPC carrier），**禁止**在这里发明 `workbench.invoke(...)` 之类的私有 RPC 或 Workbench 专属 API。

M2 实现 carrier 时，本文件只做官方协议的透明桥接，不新增动词命名空间。
