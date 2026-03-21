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
```

> **Pure TypeScript project** - executed via `tsx`, no `dist/` output.

---

## Project Structure

```
scripts/
├── index.ts              # CLI 入口
├── cli/types.ts          # CLI 类型定义
├── config/               # 配置模块 (index.ts, config.ts, types.ts)
├── browser/              # 浏览器管理 (index.ts, instance.ts, launch.ts, stealth.ts, types.ts)
├── cookie/               # Cookie 管理 (index.ts, storage.ts, validation.ts, types.ts)
├── login/                # 登录模块
│   ├── index.ts          # 入口：导出 API
│   ├── execute.ts        # 主编排 (<100 行)
│   ├── qr.ts             # QR 登录
│   ├── sms.ts            # SMS 登录
│   ├── verify.ts         # Cookie 验证
│   └── types.ts          # 类型定义
├── search/               # 搜索模块 (index.ts, execute.ts, types.ts)
├── publish/              # 发布模块
│   ├── index.ts, execute.ts, validation.ts, editor.ts, submitter.ts
│   ├── constants.ts, types.ts, auth-check.ts
│   └── uploader/         # 上传子模块
├── shared/               # 共享模块 (types.ts, constants.ts, errors.ts)
└── utils/                # 工具函数
    ├── helpers/          # delay, randomDelay, waitForCondition, retry
    ├── anti-detect/      # humanClick, checkLoginStatus, checkCaptcha
    ├── output/           # outputSuccess, outputError
    └── auth-wait.ts      # waitForCreatorLogin, saveContextCookies
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
