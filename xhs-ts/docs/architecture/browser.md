# Browser Module Architecture

Browser 模块采用 **CDP (Chrome DevTools Protocol)** 架构。

---

## 核心概念

| 特性 | 说明 |
|------|------|
| 进程分离 | 浏览器进程与 CLI 进程独立运行（detached mode） |
| 实例复用 | 跨 CLI 命令复用同一浏览器实例，避免重复启动 |
| 状态持久化 | 连接信息存储于 `profile.json`，CLI 重启后自动恢复 |
| 确定性端口 | 基于用户名 hash 计算端口，保证同一用户始终使用相同端口 |

---

## 实例获取流程

```
1. 加载已保存连接 → loadConnectionInfo(user) → profile.json
2. 验证存活状态 → checkCDPConnection(cdpPort) → GET /json/version
3. 存活则复用 / 死亡则清理后新建
4. 新建实例 → allocatePort() + spawnCDPBrowserDetached()
5. 持久化 → saveConnectionInfo() → profile.json
```

---

## 端口分配

```typescript
port = 9222 + (hash(user) % 100)  // 范围: 9222-9322
```

- 同一用户始终获得相同端口
- 冲突时遍历范围内寻找可用端口
- 分配前检查 `/json/version` 端点

---

## 连接信息持久化

```json
// users/{user}/profile.json
{
  "connection": {
    "cdpPort": 9228,
    "pid": 12345,
    "wsEndpoint": "ws://...",
    "startedAt": "2024-01-01T00:00:00Z",
    "lastActivityAt": "2024-01-02T00:00:00Z"
  }
}
```

---

## 实例关闭机制

| 层级 | 方法 | 适用场景 |
|------|------|----------|
| Level 1 | CDP `browser.close()` | 正常关闭 |
| Level 2 | `taskkill / SIGKILL` | 进程无响应 |
| Level 3 | 清理持久化状态 | 最终清理 |

---

## 公共 API

```typescript
import { withProfile, launchProfileBrowser } from './browser';

// 推荐：withProfile
await withProfile('my-user', async (page, result) => {
  const { browser, context, cdpPort, isNewInstance } = result;
  // ...
}, { headless: true, keepAlive: true });

// 低级 API：launchProfileBrowser
const result = await launchProfileBrowser({ user: 'my-user', headless: true });
```

### 生命周期管理

```typescript
// keepAlive: true (默认) - 断开连接但保持浏览器运行
await withProfile('user', callback, { keepAlive: true });

// keepAlive: false - 关闭浏览器并清理连接
await withProfile('user', callback, { keepAlive: false });
```

---

## CLI 命令

| 命令 | 说明 |
|------|------|
| `browser --start` | 启动浏览器实例 |
| `browser --stop` | 关闭所有浏览器实例 |
| `browser --stop-user <name>` | 关闭指定用户的浏览器 |
| `browser --status` | 查看浏览器状态 |
| `browser --list` | 列出所有保存的连接 |

---

## 模块职责

| 模块 | 职责 |
|------|------|
| `profile-launcher.ts` | 实例获取入口（连接复用 + 新建实例） |
| `commands.ts` | CLI 命令处理 |
| `cdp/launcher.ts` | 浏览器进程启动 |
| `cdp/connector.ts` | CDP 连接管理 |
| `cdp/port-allocator.ts` | 端口分配 |
| `user/storage-v3.ts` | 连接信息持久化 |