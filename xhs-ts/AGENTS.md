# AGENTS.md - xhs-ts Project Guide

小红书（Xiaohongshu）自动化 CLI 工具开发指南。

---

## Build/Lint/Test Commands

```bash
# Install
npm install
npm run install:browser

# Development (Pure TypeScript - no compilation)
npm run start -- <command>    # Run CLI via tsx
npm run typecheck             # Type check only
npm run lint                  # ESLint check
npm run format                # Prettier format

# Specific commands
npm run login
npm run search -- "keyword" --limit 10
npm run publish -- --title "Title" --content "Content"
npm run scrape -- note "https://..."

# Testing (planned)
npm test                      # Run all tests
npm test -- path/to/test.test.ts  # Run single test
```

> **Note**: This is a **pure TypeScript project**. Source files are executed directly via `tsx` without compilation. No `dist/` output.

---

## Project Architecture

```
scripts/
├── index.ts          # CLI entry (commander)
├── config.ts         # Global configuration management (env vars, paths)
├── browser.ts        # Playwright browser management
├── cookie.ts         # Cookie load/save/validate
├── login.ts          # Login handlers (QR/SMS)
├── search.ts         # Search notes with xsec_token extraction
├── publish.ts        # Publish notes (planned)
├── interact.ts       # Like/collect/comment/follow (planned)
├── scrape.ts         # Data scraping (planned)
├── types.ts          # Shared TypeScript types & error codes
└── utils/
    ├── anti-detect.ts    # Anti-detection utilities
    ├── helpers.ts        # General utilities (delay, debug, etc.)
    └── output.ts         # JSON output formatting

tmp/                      # Temporary files (QR codes, etc.) - auto-created
```

---

## Code Style Guidelines

### TypeScript Configuration

- **Target**: ES2022, **Module**: ESNext (ESM), **Strict**: enabled
- **Pure TypeScript**: No compilation, executed via `tsx`
- **Imports**: NO file extensions for local imports (tsx resolves automatically)
- Use `import type` for type-only imports

### Imports Order

1. Node.js built-ins
2. External packages
3. Internal modules (no `.js`/`.ts` extension)

```typescript
import { readFile } from 'fs/promises';
import { chromium, Page } from 'playwright';
import { Command } from 'commander';
import { delay } from './utils/helpers';
import type { Note } from './types';
```

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files | kebab-case | `anti-detect.ts` |
| Interfaces/Types | PascalCase | `NoteDetails`, `SearchResult` |
| Functions | camelCase, verb-first | `searchNotes()`, `delay()` |
| Constants | SCREAMING_SNAKE_CASE | `DEFAULT_TIMEOUT` |
| Variables | camelCase | `browser`, `noteList` |
| Env vars | SCREAMING_SNAKE_CASE | `PROXY`, `HEADLESS` |

### Error Handling

Use custom `XhsError` with error codes:

```typescript
export class XhsError extends Error {
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'XhsError';
  }
}

// Error codes: NOT_LOGGED_IN, RATE_LIMITED, NOT_FOUND, NETWORK_ERROR, CAPTCHA_REQUIRED
```

CLI output format (JSON):

```json
{ "error": true, "message": "...", "code": "ERROR_CODE" }
```

### Async Patterns

- Prefer `async/await` over `.then()`
- Always close resources in `finally` block

```typescript
async function scrape(url: string): Promise<void> {
  const page = await browser.newPage();
  try {
    await page.goto(url);
    // scraping logic
  } finally {
    await page.close();
  }
}
```

### Anti-Detection

- Use `randomDelay(min, max)` between actions (default: 1000-3000ms)
- Randomize mouse movement with `humanClick(page, selector)`
- Never use direct `page.click()` for user-simulated actions

---

## Output Format

All CLI commands output JSON:

```json
// Success
{ "success": true, "data": { ... } }

// Error
{ "error": true, "message": "...", "code": "ERROR_CODE" }

// QR Code (headless login)
{
  "type": "qr_login",
  "status": "waiting_scan",
  "qrPath": "/absolute/path/to/tmp/qr_login_20260319_093000.png",
  "message": "请使用小红书 App 扫描二维码登录"
}
```

---

## Documentation Sync Rule

**When making changes, MUST update related documentation:**

| Change Type | Files to Update |
|-------------|-----------------|
| New module/file | `AGENTS.md` → Project Architecture section |
| Function signature change | `AGENTS.md` → Code Style Guidelines section |
| New CLI command | `SKILL.md`, `README.md` → Commands section |
| Architecture change | `AGENTS.md` → Project Architecture section |
| New error code | `AGENTS.md` → Error Handling section, `SKILL.md` → Error Codes |
| New env variable | `AGENTS.md` → Important Notes, `.env` file |
| New type/interface | `types.ts` header comments |

**Before completing any task:**
1. Check if any doc needs updating
2. Update `AGENTS.md` first (single source of truth)
3. Sync changes to `SKILL.md` and `README.md` if user-facing

---

## Important Notes

1. **Rate Limiting**: Always use `randomDelay()` between actions
2. **Cookie Storage**: `cookies.json` at project root (git-ignored)
3. **Debug Mode**: Set `DEBUG=true` in `.env`
4. **Headless Mode**: Auto-detected - forced `true` if no display support (CI, Linux server), otherwise uses `.env` setting (default: `false`)
5. **Proxy**: Configure `PROXY` in `.env` for high-frequency operations
5. **Pure TypeScript**: No compilation, executed via `tsx`. Imports use NO extensions
6. **Type Safety**: Run `npm run typecheck` before committing
7. **QR Code Storage**: QR codes saved to `tmp/` directory with timestamp naming (`qr_login_YYYYMMDD_HHmmss.png`)
8. **Configuration**: All env vars managed via `config.ts` - import from `./config` not `./utils/helpers`