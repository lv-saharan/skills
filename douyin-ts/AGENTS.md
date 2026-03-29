# AGENTS.md — douyin-ts

抖音自动化 TypeScript 项目。使用 Playwright 实现登录、搜索、点赞、收藏、关注等功能。

---

## Build/Lint/Test Commands

```bash
# Type check (no emit)
npm run typecheck

# Start CLI
npm run start
npm run help

# Specific actions
npm run login                # QR 登录
npm run login:headless       # 无头模式登录
npm run user                 # 用户管理
npm run search-video -- "keyword" [--sort-type <type>] [--publish-time <time>]
npm run search-user -- "keyword"
npm run like -- "<url>"
npm run collect -- "<url>"
npm run follow -- "<url>"

# Browser setup
npm run install:browser      # 安装 Chromium
```

**Note**: No test suite exists in this project.

---

## Project Structure

```
douyin-ts/
├── scripts/           # Main implementation
│   ├── browser/       # Browser launch, context, session, cleanup
│   ├── cli/           # CLI type definitions
│   ├── config/        # App configuration, URLs
│   ├── cookie/        # Cookie storage, validation
│   ├── interact/      # Search, like, collect, follow operations
│   ├── login/         # QR login, verification
│   ├── shared/        # Errors, constants, types (global)
│   ├── user/          # Multi-user management, fingerprint
│   └── utils/         # Helpers, logging, output formatting
│   └── index.ts       # CLI entry point (Commander)
├── users/             # User data storage (cookies, fingerprints)
├── references/        # Reference files (empty)
├── package.json
├── tsconfig.json
├── .eslintrc.json
├── .prettierrc
└── SKILL.md           # Skill documentation
```

---

## Code Style Guidelines

### Imports

**ALWAYS use `import type` for type-only imports:**

```typescript
// Correct
import type { Page } from 'playwright';
import type { VideoSearchOptions, VideoSearchResult } from './types';

// Wrong
import { VideoSearchOptions } from './types';  // Only imports type
```

**Import order (enforced by ESLint):**
1. Node builtins
2. External packages (playwright, commander)
3. Internal modules (../shared, ../config)
4. Parent/sibling imports
5. Type imports (last)

```typescript
import { chromium } from 'playwright';
import type { Browser } from 'playwright';

import { DouyinError, DouyinErrorCode } from '../shared';
import type { BrowserLaunchOptions } from './types';
import { config } from '../config';
import { debugLog } from '../utils/helpers';
```

### Types & Interfaces

- **PascalCase** for interfaces, types, classes
- Use `interface` for object shapes, `type` for unions/aliases
- Export types from dedicated `types.ts` files per module

```typescript
// Good
export interface VideoSearchOptions {
  keyword: string;
  sortType?: VideoSortTypeValue;
  limit?: number;
}

export type VideoSortTypeValue = 'comprehensive' | 'most-likes' | 'latest';

// Enum-like pattern (prefer const object over enum)
export const VideoSortType = {
  COMPREHENSIVE: 'comprehensive',
  MOST_LIKES: 'most-likes',
  LATEST: 'latest',
} as const;
```

### Naming Conventions

| Kind | Convention | Example |
|------|------------|---------|
| Variables | camelCase | `videoId`, `sortType` |
| Functions | camelCase | `executeSearchVideo`, `extractVideoId` |
| Classes | PascalCase | `DouyinError` |
| Interfaces | PascalCase | `VideoSearchOptions` |
| Constants | UPPER_SNAKE_CASE | `DEFAULT_LIMIT`, `MAX_SCROLL_ATTEMPTS` |
| Files | lowercase-dash | `search-video.ts`, `url-utils.ts` |
| Folders | lowercase | `browser/`, `interact/` |

### Functions

- **Explicit return types** (ESLint warn)
- Async functions must return `Promise<T>` or `Promise<void>`
- Never ignore floating promises (ESLint error)

```typescript
// Good
export async function executeSearchVideo(options: VideoSearchOptions): Promise<void> {
  // ...
}

function buildUrl(keyword: string, sortType: VideoSortTypeValue): string {
  return 'https://www.douyin.com/search/' + encodeURIComponent(keyword);
}

// Wrong
async function doSomething() {  // Missing return type
  somePromise;  // Floating promise - ESLint error
}
```

### Error Handling

Use `DouyinError` class with error codes from `shared/errors.ts`:

```typescript
import { DouyinError, DouyinErrorCode } from '../shared';

// Throw custom error
throw new DouyinError(
  'Failed to launch browser',
  DouyinErrorCode.BROWSER_ERROR,
  { originalError: error }
);

// Catch and handle
try {
  await riskyOperation();
} catch (error) {
  if (error instanceof Error) {
    outputFromError(error);
  } else {
    outputFromError(new Error(String(error)));
  }
}
```

**Error codes available:**
- `NOT_LOGGED_IN`, `RATE_LIMITED`, `NOT_FOUND`
- `NETWORK_ERROR`, `CAPTCHA_REQUIRED`, `COOKIE_EXPIRED`
- `LOGIN_FAILED`, `BROWSER_ERROR`, `VALIDATION_ERROR`
- `INTERNAL_ERROR`, `NOT_IMPLEMENTED`

### Async/Await

- Always use async/await (no raw Promise.then)
- Handle rejections with try/catch
- Use `await` for all Promise-returning calls

```typescript
// Good
const result = await doSearch(page, options);
await delay(SCROLL_DELAY);

// Wrong
doSearch(page, options).then(r => ...);  // Use async/await
delay(1000);  // Missing await - ESLint error
```

### Constants

Define module-level constants at file top:

```typescript
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const SCROLL_DELAY = 1500;
const MAX_SCROLL_ATTEMPTS = 10;
```

### Module Exports

Use index.ts for barrel exports:

```typescript
// config/index.ts
export { config, validateConfig, DY_URLS } from './config';
export type { AppConfig } from './types';
```

---

## Formatting (Prettier)

```json
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf"
}
```

---

## TypeScript Config

```json
{
  "target": "ES2022",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "strict": true,
  "verbatimModuleSyntax": true,
  "allowImportingTsExtensions": true,
  "noEmit": true
}
```

**Key implications:**
- ES modules only (`import/export`, no `require`)
- Strict mode enabled
- Type imports mandatory for pure types
- Run with `tsx` (no build step)

---

## ESLint Rules (Critical)

| Rule | Level | Note |
|------|-------|------|
| `@typescript-eslint/no-explicit-any` | error | Never use `any` |
| `@typescript-eslint/consistent-type-imports` | error | Use `import type` |
| `@typescript-eslint/no-floating-promises` | error | Always await |
| `@typescript-eslint/explicit-function-return-type` | warn | Add return types |
| `import/order` | error | Alphabetized imports |
| `prefer-const` | error | Use `const` when possible |
| `eqeqeq` | error | Always `===`, never `==` |

---

## Playwright Patterns

```typescript
// Navigate with timeout
await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

// Wait for selector with fallback
await page.waitForSelector(selector, { timeout: 10000 })
  .catch(() => debugLog('Selector not found'));

// Locator usage
const cards = await page.locator('.search-result-card').all();

// Evaluate in page context
const title = await card.evaluate((el: Element) => 
  el.querySelector('.VDYK8Xd7')?.textContent?.trim() || ''
);
```

---

## Debug Logging

```typescript
import { debugLog } from '../utils/helpers';

debugLog('Search URL:', url);
debugLog('Cards found:', cards.length);
```

---

## Output Format

All CLI commands output JSON via `outputSuccess` or `outputError`:

```typescript
import { outputSuccess, outputFromError } from '../utils/output';

// Success
outputSuccess({ ...result, filters }, 'PARSE:search-video-results');

// Relay message to user
outputSuccess(result, 'RELAY:点赞成功');

// Error
outputFromError(error);
```

---

## Important Notes

1. **No `any` type** — Use specific types or generics
2. **No raw enums** — Use `const` object + `as const` + `typeof` pattern
3. **Always await promises** — Floating promises cause ESLint errors
4. **Comment headers** — Each file has module docstring with `@module` and `@description`
5. **Selectors update** — Douyin DOM changes; selectors documented in `SKILL.md` with date