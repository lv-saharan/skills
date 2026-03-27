# AGENTS.md - xhs-ts Project Guide

小红书（Xiaohongshu）自动化 CLI 工具开发指南。

---

## Build/Lint/Test

```bash
npm install && npm run install:browser  # Install
npm run start -- <command>              # Run CLI
npm run typecheck                       # Type check
npm run lint                            # ESLint check
npm run lint:fix                        # Auto-fix lint issues
npm run test                            # Run tests
npm run test:ui                         # Run tests with UI
npm run test:debug                      # Debug tests
```

> **Pure TypeScript project** - executed via `tsx`, no `dist/` output.

---

## Project Structure

```
scripts/
├── index.ts              # CLI 入口
├── cli/types.ts          # CLI 类型定义
├── config/               # 配置模块 (index.ts, config.ts, types.ts)
├── browser/              # 浏览器管理 (index.ts, context.ts, instance.ts, launch.ts, session.ts, stealth.ts, types.ts)
├── cookie/               # Cookie 管理 (index.ts, storage.ts, validation.ts, types.ts)
├── user/                 # 多用户管理模块
│   ├── index.ts          # 入口：导出 API
│   ├── storage.ts        # 目录操作、users.json 读写
│   ├── migration.ts      # 单用户到多用户迁移
│   └── types.ts          # 类型定义
├── login/                # 登录模块
│   ├── index.ts          # 入口：导出 API
│   ├── execute.ts        # 主编排 (<100 行)
│   ├── qr.ts             # QR 登录
│   ├── sms.ts            # SMS 登录
│   ├── verify.ts         # Cookie 验证
│   └── types.ts          # 类型定义
├── search/               # 搜索模块 (index.ts, execute.ts, result-extractor.ts, url-builder.ts, types.ts)
├── publish/              # 发布模块
│   ├── index.ts, execute.ts, validation.ts, editor.ts, submitter.ts
│   ├── constants.ts, types.ts, auth-check.ts
│   └── uploader/         # 上传子模块 (index.ts, upload.ts, upload-wait.ts, tab-switch.ts, login-detection.ts)
├── interact/             # 互动模块
│   ├── index.ts          # 入口：导出 API
│   ├── types.ts          # 类型定义
│   ├── selectors.ts      # 选择器定义
│   ├── shared.ts         # 共享工具 (withAuthenticatedAction, preparePageForAction)
│   ├── url-utils.ts      # URL 提取工具 (extractNoteId, extractUserId)
│   ├── like.ts           # 点赞
│   ├── collect.ts        # 收藏
│   ├── comment.ts        # 评论
│   └── follow.ts         # 关注
├── scrape/               # 数据抓取模块
│   ├── index.ts          # 入口：导出 API
│   ├── types.ts          # 类型定义
│   ├── selectors.ts      # 选择器定义
│   ├── utils.ts          # 工具函数 (createNoteErrorResult, parseCount)
│   ├── note.ts           # 笔记抓取
│   └── user.ts           # 用户抓取
├── shared/               # 共享模块 (types.ts, constants.ts, errors.ts, index.ts)
└── utils/                # 工具函数
    ├── index.ts          # 工具导出
    ├── logging.ts        # 日志工具
    ├── auth-wait.ts      # waitForCreatorLogin, saveContextCookies
    ├── helpers/index.ts  # delay, randomDelay, waitForCondition, retry
    ├── anti-detect/index.ts  # humanClick, checkLoginStatus, checkCaptcha
    └── output/           # outputSuccess, outputError
```

---

## 核心规范

### 1. 模块设计

| 规则 | 要求 |
|------|------|
| 目录结构 | 每个功能独立目录，`index.ts` 为入口 |
| 文件大小 | 单文件 ≤ 500 行，超出按职责拆分 |
| 函数长度 | 单函数 ≤ 50 行 |
| 导入数量 | 单文件 ≤ 15 个导入 |

### 2. Import 模式

```typescript
// 类型 → 从 types.ts 导入
import type { BrowserInstance } from '../browser/types';

// 函数 → 从 index.ts 导入
import { createBrowserInstance } from '../browser';

// 常量 → 从 constants.ts 导入
import { PAGE_LOAD_TIMEOUT } from './constants';
```

### 3. 代码复用

| 工具函数 | 用途 |
|----------|------|
| `waitForCondition(condition, options)` | **替代所有 while 循环** |
| `waitForCreatorLogin(page, timeout)` | 创作者中心登录等待 |
| `saveContextCookies(context)` | Cookie 保存 |
| `resolveHeadless(override, config)` | headless 解析 |
| `withAuthenticatedAction(headless, user, callback)` | 统一认证流程 |
| `preparePageForAction(page, url)` | 页面准备（导航+错误检查+模拟阅读） |

**禁止手写 while 循环等待：**
```typescript
// ✅ CORRECT
await waitForCondition(async () => page.isVisible('#btn'), { timeout: 10000 });

// ❌ WRONG
while (Date.now() - startTime < timeout) { ... }
```

### 4. 类型组织

| 类型 | 位置 |
|------|------|
| 模块私有类型 | `<module>/types.ts` |
| 模块公共类型 | `<module>/types.ts` + 通过 index.ts 导出 |
| 全局共享类型 | `shared/types.ts` |

---

## Interact Module Architecture

互动模块（like, collect, comment, follow）采用统一架构：

### 共享工具 (scripts/interact/shared.ts)

```typescript
// 执行认证操作（处理 Cookie 加载、登录验证）
await withAuthenticatedAction(headless, user, async (page) => {
  // 业务逻辑
});

// 准备页面（导航 + 错误检查 + 模拟阅读）
const pageError = await preparePageForAction(page, url);

// 延迟常量
INTERACTION_DELAYS.afterNavigation  // 1500-2500ms
INTERACTION_DELAYS.afterClick        // 1000-1500ms
INTERACTION_DELAYS.batchInterval     // 2000ms
```

### URL 工具 (scripts/interact/url-utils.ts)

```typescript
// 从 URL 提取笔记 ID
const result = extractNoteId(url);
// { success: true, id: "noteId" } | { success: false, error: "..." }

// 从 URL 提取用户 ID
const result = extractUserId(url);
```

### 错误检测

评论模块包含错误检测：
- 手机号绑定要求 (`评论受限: 绑定手机`)
- 频率限制
- 需要登录

### 实现模式

```typescript
// 每个互动命令遵循：

// 1. 从 URL 提取 ID
const extraction = extractNoteId(url);
if (!extraction.success) return { success: false, error: extraction.error };

// 2. 准备页面
const pageError = await preparePageForAction(page, url);
if (pageError) return { success: false, error: pageError };

// 3. 检查状态 / 执行操作
const status = await checkStatus(page);
if (status.alreadyDone) return { success: true, alreadyDone: true };

// 4. 执行操作
await humanClick(page, SELECTORS.button);

// 5. 验证结果
const finalStatus = await checkStatus(page);
return { success: finalStatus.done, ... };
```

---

## Anti-Detection

| 技术 | 实现 |
|------|------|
| Minimal Browser Args | 仅 `--start-maximized` |
| Stealth Script | `context.addInitScript()` |
| Homepage Entry | 从主页点击进入创作者中心 |
| Random Delays | `randomDelay(1000, 3000)` |

**关键：禁止直接导航到创作者中心**
```typescript
// ❌ WRONG - triggers detection
await page.goto('https://creator.xiaohongshu.com/publish');

// ✅ CORRECT - simulate real user
await page.goto('https://www.xiaohongshu.com');
await page.click('a[href*="creator.xiaohongshu.com"]');
```

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

## Output Format

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "error": true, "message": "...", "code": "ERROR_CODE" }

// QR Code
{ "type": "qr_login", "qrPath": "/abs/path/to/qr.png" }
```

---

## Commands Reference

| 命令 | 参数 | 说明 |
|------|------|------|
| `user` | `--set-current <name>`, `--set-default` | 用户管理 |
| `login` | `--qr`, `--sms`, `--headless`, `--timeout`, `--user` | 登录 |
| `search <keyword>` | `--limit`, `--skip`, `--sort`, `--note-type`, `--time-range`, `--scope`, `--location`, `--user` | 搜索 |
| `publish` | `--title`, `--content`, `--images`, `--video`, `--tags`, `--user` | 发布 |
| `like [urls...]` | `--delay`, `--headless`, `--user` | 点赞 |
| `collect [urls...]` | `--delay`, `--headless`, `--user` | 收藏 |
| `comment <url> <text>` | `--headless`, `--user` | 评论 |
| `follow [urls...]` | `--delay`, `--headless`, `--user` | 关注 |
| `scrape-note <url>` | `--comments`, `--max-comments`, `--user` | 抓取笔记 |
| `scrape-user <url>` | `--notes`, `--max-notes`, `--user` | 抓取用户 |

---

## Browser Resource Management (TypeScript 5.2+)

### Modern Pattern with `await using`

```typescript
import { withSession } from './browser';

// Pattern 1: Using withSession helper
const result = await withSession(async (session) => {
  await session.page.goto('https://example.com');
  return await session.page.title();
}, { headless: true });

// Pattern 2: Direct await using
await using session = await BrowserSession.create({ headless: true });
await session.page.goto('https://example.com');
// Automatic cleanup when scope exits
```

### Multi-Page Management

```typescript
await withSession(async (session) => {
  const [newPage] = await Promise.all([
    session.context.waitForEvent('page'),
    session.page.click('a[href*="creator.xiaohongshu.com"]'),
  ]);
  
  const trackedPage = session.trackPage(newPage, 'publish');
  await trackedPage.page.goto('...');
}, { headless: true });
```

---

## Multi-User Management

### Architecture

```
users/
├── users.json            # { current: "用户名", version: 1 }
├── default/
│   ├── cookies.json
│   └── tmp/
└── {用户名}/
    ├── cookies.json
    └── tmp/
```

### Key APIs

```typescript
import {
  listUsers,           // 获取用户列表
  setCurrentUser,      // 设置当前用户
  clearCurrentUser,    // 重置为默认用户
  resolveUser,         // 解析用户优先级
  createUserDir,       // 创建用户目录
  userExists,          // 检查用户是否存在
} from './user';

// 用户解析优先级: --user > users.json current > 'default'
const user = resolveUser(options.user);
```

### Migration

首次启动时自动迁移：

1. 创建 `users/default/` 目录
2. 复制 `cookies.json` → `users/default/cookies.json`
3. 移动 `tmp/*` → `users/default/tmp/`
4. 创建 `users.json`
5. 删除旧文件

---

## Verification

**每次修改后必须执行：**
```bash
npm run lint && npm run typecheck
```

---

## Important Notes

1. **Rate Limiting**: 使用 `randomDelay()` 
2. **Cookie Storage**: `cookies.json` (git-ignored)
3. **Debug Mode**: `DEBUG=true` in `.env`
4. **Headless Mode**: 无显示时强制 true
5. **Pure TypeScript**: 无编译，tsx 直接执行
6. **Wait Helpers**: 使用 `waitForCondition()`，禁止手写 while
7. **Anti-Detection**: 最小化浏览器参数 + stealth 脚本
8. **Node.js**: >= 22.16.0 (required for `using` syntax)
9. **TypeScript**: >= 5.2 (for `AsyncDisposable` support)