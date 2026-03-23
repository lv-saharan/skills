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
├── browser/              # 浏览器管理 (index.ts, context.ts, instance.ts, launch.ts, stealth.ts, types.ts)
├── cookie/               # Cookie 管理 (index.ts, storage.ts, validation.ts, types.ts)
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
│   └── uploader/         # 上传子模块 (upload.ts, upload-wait.ts, tab-switch.ts, login-detection.ts)
├── interact/             # 互动模块 (点赞、收藏、评论、关注)
├── scrape/               # 数据抓取模块
├── shared/               # 共享模块 (types.ts, constants.ts, errors.ts, index.ts)
└── utils/                # 工具函数
    ├── index.ts          # 工具导出
    ├── logging.ts        # 日志工具
    ├── auth-wait.ts      # waitForCreatorLogin, saveContextCookies
    ├── helpers/          # delay, randomDelay, waitForCondition, retry
    ├── anti-detect/      # humanClick, checkLoginStatus, checkCaptcha
    └── output/           # outputSuccess, outputError
```

```
tests/
├── e2e/                  # E2E 测试
│   ├── login.spec.ts     # 登录流程测试
│   └── search.spec.ts    # 搜索功能测试
├── fixtures/             # 测试夹具
│   └── test-fixture.ts   # 基础测试夹具 (authenticatedPage)
├── utils/                # 测试工具
│   └── test-helpers.ts   # 测试辅助函数
└── global-setup.ts       # 全局设置
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

**Async Pattern:**
```typescript
const page = await browser.newPage();
try { /* logic */ } finally { await page.close(); }
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

## Testing with Playwright

### 测试约束

| 规则 | 要求 |
|------|------|
| 测试框架 | Playwright Test (@playwright/test) |
| 测试目录 | `tests/` (项目根目录) |
| 测试文件 | `*.spec.ts` |
| 浏览器 | Chromium only |
| 超时设置 | 默认 30s，登录操作 60s |
| 无头模式 | 默认 `false` (便于调试) |

### 配置文件

详见 `playwright.config.ts`。关键配置：
- `testDir: './tests'`
- `timeout: 30 * 1000`
- `screenshot: 'only-on-failure'`
- `video: 'retain-on-failure'`

### 测试夹具

**`tests/fixtures/test-fixture.ts`** 提供：
- `authenticatedPage` - 已登录的页面实例（自动加载 `cookies.json`）
- `testCookies` - 测试专用 Cookie 数组

**使用方式：**
```typescript
import { test, expect } from '../fixtures/test-fixture';

test('should do something', async ({ authenticatedPage }) => {
  const page = authenticatedPage;
  // 测试逻辑...
});
```

### 测试工具

**`tests/utils/test-helpers.ts`** 提供：
- `waitForPageLoad(page)` - 等待页面加载
- `randomDelay(min, max)` - 随机延迟（模拟真实用户）
- `waitForElement(page, selector, timeout)` - 等待元素可见
- `humanClick(locator)` - 模拟真实点击
- `humanType(locator, text)` - 模拟真实输入

### 测试命令

```bash
npm run test            # 运行所有测试
npm run test:ui         # UI 模式
npm run test:debug      # 调试模式
npm run test:headed     # 有头模式
npm run test:report     # 查看报告
```

### 编码规范

**必须遵守：**
1. 从 `tests/fixtures/test-fixture.ts` 导入 `test` 和 `expect`
2. 使用 `authenticatedPage` 夹具，避免重复登录
3. 使用显式等待 (`toBeVisible`, `waitForLoadState`)
4. 每个测试独立，不依赖其他测试状态

**禁止：**
```typescript
// ❌ 禁止手写等待
await page.waitForTimeout(5000);

// ❌ 禁止直接导入基础 test
import { test } from '@playwright/test';
```

### Cookie 管理

1. 运行 `npm run login` 获取 `cookies.json`
2. 测试自动加载 Cookie（通过 `test-fixture.ts`）
3. 测试环境使用独立 Cookie 文件 `test-cookies.json`（git-ignored）

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
6. **No CI/CD**: 个人项目保持简洁
7. **Wait Helpers**: 使用 `waitForCondition()`，禁止手写 while
8. **Login Module**: 保持结构完整 (execute.ts, qr.ts, sms.ts, verify.ts)
9. **Temp Files**: 使用 `getTmpFilePath()` 管理临时文件路径
10. **Anti-Detection**: 最小化浏览器参数 + stealth 脚本

---

## Browser Resource Management (TypeScript 5.2+)

### Modern Pattern with `await using`

The project uses TypeScript 5.2+ `AsyncDisposable` pattern for automatic browser resource cleanup.

**Recommended usage:**
```typescript
import { withSession } from './browser';

// Pattern 1: Using withSession helper
const result = await withSession(async (session) => {
  await session.page.goto('https://example.com');
  return await session.page.title();
}, { headless: true });

// Pattern 2: Direct await using (when you need more control)
await using session = await BrowserSession.create({ headless: true });
await session.page.goto('https://example.com');
// Automatic cleanup when scope exits
```

### Multi-Page Management

For scenarios that open new tabs (e.g., publish flow):

```typescript
await withSession(async (session) => {
  // Open new tab
  const [newPage] = await Promise.all([
    session.context.waitForEvent('page'),
    session.page.click('a[href*="creator.xiaohongshu.com"]'),
  ]);
  
  // Track for automatic cleanup
  const trackedPage = session.trackPage(newPage, 'publish');
  
  // Use trackedPage.page for operations
  await trackedPage.page.goto('...');
  
  // Optional: close early if needed
  await session.closePage('publish');
}, { headless: true });
// All tracked pages + context + browser are cleaned up automatically
```

### Key Features

| Feature | Description |
|---------|-------------|
| **Automatic cleanup** | `await using` ensures disposal even on error |
| **Rollback on failure** | Partial initialization is cleaned up |
| **Explicit close order** | pages → context → browser (LIFO) |
| **Multi-page tracking** | `trackPage()` for dynamically opened tabs |
| **Error aggregation** | Cleanup errors don't mask original errors |

### Legacy API (Backward Compatible)

The old `createBrowserInstance`/`closeBrowserInstance` pattern still works but is deprecated:

```typescript
// Legacy pattern (still supported)
let instance = await createBrowserInstance({ headless });
try {
  // ...
} finally {
  await closeBrowserInstance(instance);
}

// New pattern (recommended)
await using session = await BrowserSession.create({ headless });
// Automatic cleanup
```

### Requirements

- **Node.js**: >= 22.16.0 (required for `using` syntax)
- **TypeScript**: >= 5.2 (for `AsyncDisposable` support)
