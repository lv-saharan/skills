# Multi-User Management Architecture

xhs-ts 支持多个小红书账号，每个用户拥有独立的 Cookie、指纹和临时文件。

---

## 目录结构

```
users/
├── users.json            # { current: "用户名", version: 3 }
├── default/
│   ├── user-data/        # Playwright 持久化上下文（cookies、localStorage）
│   ├── profile.json      # 统一 Profile 数据（meta + connection）
│   ├── fingerprint.json  # 设备指纹
│   └── tmp/              # 临时文件（QR 码等）
└── {用户名}/
    ├── user-data/
    ├── profile.json
    ├── fingerprint.json
    └── tmp/
```

---

## 版本 3 变更

| 变更 | 说明 |
|------|------|
| 移除 `profiles` 字段 | 所有 Profile 数据存储在 `users/{user}/profile.json` |
| 合并 `meta.json` | 元数据合并入 `profile.json` 的 `meta` 字段 |
| 连接信息 | 存储在 `profile.json` 的 `connection` 字段 |

---

## 用户选择优先级

```
--user <name>  >  users.json current  >  default
```

---

## 公共 API

```typescript
import {
  listUsers,           // 获取用户列表
  setCurrentUser,      // 设置当前用户
  clearCurrentUser,    // 重置为默认用户
  resolveUser,         // 解析用户优先级
  createUserProfile,   # 创建用户 Profile
  hasProfile,          // 检查 Profile 是否存在
  loadUserProfileData, // 加载 Profile 数据
  saveUserProfileData, // 保存 Profile 数据
  loadConnectionInfo,  // 加载连接信息
  saveConnectionInfo,  // 保存连接信息
} from './user';

// 用户解析
const user = resolveUser(options.user);
```

---

## 数据结构

### users.json

```json
{
  "version": 3,
  "current": "default"
}
```

### profile.json

```json
{
  "version": 1,
  "meta": {
    "createdAt": "2024-01-01T00:00:00Z",
    "lastUsedAt": "2024-01-02T00:00:00Z",
    "environmentType": "gui-native"
  },
  "connection": {
    "cdpPort": 9228,
    "pid": 12345,
    "wsEndpoint": "ws://...",
    "startedAt": "2024-01-01T00:00:00Z",
    "lastActivityAt": "2024-01-02T00:00:00Z"
  }
}
```

### fingerprint.json

```json
{
  "userAgent": "Mozilla/5.0 ...",
  "viewport": { "width": 1920, "height": 1080 },
  "screen": { "width": 1920, "height": 1080, "colorDepth": 24 },
  "timezone": "Asia/Shanghai",
  "language": "zh-CN",
  "platform": "Win32",
  "webgl": {
    "vendor": "Google Inc.",
    "renderer": "ANGLE ..."
  }
}
```

---

## CLI 命令

```bash
# 查看用户列表
npm run user

# 设置当前用户
npm run user:use -- "小号"

# 登录指定用户
npm run login -- --user "小号"

# 搜索指定用户
npm run search -- "美食" --user "小号"
```

---

## 迁移

首次启动时自动迁移：

1. 创建 `users/default/` 目录
2. 创建 `user-data/` 目录（Playwright 持久化上下文）
3. 创建 `profile.json`（统一 meta + connection）
4. 创建 `fingerprint.json`
5. 创建 `users.json` (version: 3)

---

## 文件职责

| 文件 | 职责 |
|------|------|
| `storage.ts` | 目录操作、users.json 读写 |
| `storage-v3.ts` | 统一 Profile 存储 |
| `users-meta.ts` | users.json 元数据管理 |
| `profile-loader.ts` | Profile 加载器 |
| `environment.ts` | 环境检测模块 |
| `migration.ts` | 单用户到多用户迁移 |
| `fingerprint.ts` | 设备指纹生成 |