# AGENTS.md - xhs-ts Project Guide

小红书（Xiaohongshu）自动化 CLI 工具开发指南。

---

## Build/Lint/Test

```bash
npm install && npm run install:browser  # Install
npm run typecheck                       # Type check
npm run lint                            # ESLint check
npm run test                            # Run tests
```

> **Pure TypeScript** - executed via `tsx`, no `dist/` output.

---

## Project Structure

```
scripts/
├── actions/      # 所有操作模块（统一入口）
│   ├── shared/   # 共享 Session 管理（withSession API）
│   ├── login/    # 登录 (qr, sms, auto-login)
│   ├── search/   # 搜索
│   ├── publish/  # 发布 (uploader/)
│   ├── interact/ # 互动 (like, collect, comment, follow)
│   └── scrape/   # 抓取 (note, user)
├── core/         # 核心基础设施（平台无关）
│   ├── browser/  # CDP 浏览器管理
│   ├── anti-detect/ # 反检测
│   ├── utils/    # 工具函数
│   └── error/    # 错误处理
├── config/       # 配置（URLs, selectors, timeouts）
├── user/         # 多用户管理 (storage-v3, profile-loader, migration)
└── cli/          # CLI 命令入口
```

> 详细结构：`tree scripts/` 或查看各模块 `index.ts`

---

## 核心规范

### 模块设计

| 规则 | 要求 |
|------|------|
| 目录结构 | 独立目录，`index.ts` 为入口 |
| 文件大小 | ≤ 500 行，超出按职责拆分 |
| 函数长度 | ≤ 50 行 |
| 导入数量 | ≤ 15 个 |

### Import 模式

```typescript
// 类型 → types.ts | 函数 → index.ts | 常量 → constants.ts
import type { X } from './types';
import { fn } from '../module';
import { CONST } from './constants';
```

### 代码复用

| 工具函数 | 用途 |
|----------|------|
| `withSession()` | **统一认证入口** - 浏览器启动 + 导航首页 + 登录验证 |
| `withAuthenticatedAction()` | 简化版认证（向后兼容） |
| `preparePageForAction()` | 页面准备（导航+错误检查+模拟阅读） |
| `waitForCondition()` | **替代所有 while 循环** |
| `humanScroll()` | 物理滚动模拟 |

---

## 禁止项

```typescript
// ❌ 类型错误抑制
as any, @ts-ignore, @ts-expect-error

// ❌ 手写 while 循环
while (Date.now() - startTime < timeout) { ... }
// ✅ 使用 waitForCondition()
await waitForCondition(async () => page.isVisible('#btn'), { timeout: 10000 });

// ❌ 空catch块
catch (e) {}

// ❌ 直接导航到创作者中心
await page.goto('https://creator.xiaohongshu.com/publish');
// ✅ 从主页点击进入
await page.goto('https://www.xiaohongshu.com');
await page.click('a[href*="creator.xiaohongshu.com"]');
```

---

## 关键 API

```typescript
// 统一 Session 管理（推荐）
import { withSession, type SessionContext } from './actions/shared/session';
await withSession(user, async (ctx) => {
  const { page, behavior, user } = ctx;
  // withSession 已处理：浏览器启动 → 导航首页 → 登录验证
  // ... 执行操作
}, { headless: true });

// 简化版（向后兼容）
import { withAuthenticatedAction } from './actions/shared/session';
await withAuthenticatedAction(headless, user, async (page, behavior) => { ... });

// 页面准备工具
import { preparePageForAction, checkPageHealth } from './actions/shared/session';
const error = await preparePageForAction(page, url); // 导航 + 检查 + 模拟阅读

// URL 提取
import { extractNoteIdFromUrl, extractUserIdFromUrl } from './actions/interact/url-utils';
const { noteId } = extractNoteIdFromUrl(url);

// 用户管理
import { resolveUser, listUsers } from './user';
const user = resolveUser(options.user);  // --user > current > default

// 反检测脚本
import { generateStealthScript } from './core/browser/stealth';
const script = generateStealthScript(fingerprint);
```

---

## 核心架构

### Browser Module (CDP)

- **进程分离**：detached mode，CLI 退出后浏览器继续运行
- **实例复用**：跨命令共享浏览器实例
- **端口分配**：`9222 + hash(user) % 100`
- **持久化**：`users/{user}/profile.json`

> 详见 [docs/architecture/browser.md](docs/architecture/browser.md)

### Stealth Module

模块化反检测脚本：navigator, screen, webgl, canvas, audio, webrtc 等 15 个模块。

> 详见 [docs/architecture/stealth.md](docs/architecture/stealth.md)

### Multi-User Management

```
users/
├── users.json      # { current, version: 3 }
└── {user}/
    ├── user-data/  # Playwright context (cookies)
    └── profile.json # meta + connection
```

> 详见 [docs/architecture/multi-user.md](docs/architecture/multi-user.md)

---

## Output Format

```json
// Success
{ "success": true, "data": { ... }, "toAgent": "PARSE:notes" }

// Error
{ "error": true, "message": "...", "code": "NOT_LOGGED_IN" }

// QR Code
{ "type": "qr_login", "qrPath": "/abs/path/to/qr.png" }
```

---

## Commands Reference

| 命令 | 说明 |
|------|------|
| `npm run login` | 扫码/短信登录 |
| `npm run search -- "<keyword>"` | 搜索笔记 |
| `npm run publish` | 发布笔记 |
| `npm run like/collect/comment/follow` | 互动操作 |
| `npm run scrape-note/user` | 数据抓取 |
| `npm run browser -- --start/stop/status` | 浏览器管理 |
| `npm run user` | 用户管理 |

> 完整参数见 [SKILL.md](SKILL.md)

---

## Code Style

| 元素 | 规范 | 示例 |
|------|------|------|
| Files | kebab-case | `anti-detect.ts` |
| Interfaces | PascalCase | `LoginOptions` |
| Functions | camelCase | `executeLogin()` |
| Constants | SCREAMING_SNAKE_CASE | `PAGE_LOAD_TIMEOUT` |

**Error Handling:**
```typescript
throw new XhsError(message, XhsErrorCode.NOT_LOGGED_IN);
```

---

## Important Notes

1. **Rate Limiting**: `randomDelay()` 2-5 秒间隔
2. **Headless**: Linux 服务器（无 DISPLAY）强制 true
3. **URL**: 必须包含 `xsec_token` 参数
4. **Comment**: 需绑定手机号
5. **Node.js**: >= 22.16.0 (`using` syntax)
6. **TypeScript**: >= 5.2 (`AsyncDisposable`)
7. **Debug Mode**: `DEBUG=true` in `.env`

---

## References

- [Browser Architecture](docs/architecture/browser.md)
- [Stealth Module](docs/architecture/stealth.md)
- [Multi-User Management](docs/architecture/multi-user.md)
- [Channel Integration](references/channel-integration.md)
- [Troubleshooting](references/troubleshooting.md)