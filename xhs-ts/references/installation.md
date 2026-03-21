# Installation Guide

## Prerequisites

- Node.js >= 18
- npm or pnpm

## Install Steps

### Step 1: Install Dependencies

```bash
cd {baseDir}
npm install
```

### Step 2: Install Playwright Browser

```bash
npm run install:browser
```

**China Mirror (optional):**

```bash
# Windows
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright && npm run install:browser

# macOS/Linux
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npm run install:browser
```

### Step 3: Verify Installation

```bash
npm run start -- --help
```

## Manual Cookie Import

If login fails, manually import cookies:

1. Login to xiaohongshu.com in browser
2. Open DevTools (F12) → Application → Cookies → xiaohongshu.com
3. Copy key cookies (a1, web_session, etc.)
4. Create `{baseDir}/cookies.json`:

```json
{
  "cookies": [
    { "name": "a1", "value": "YOUR_VALUE", "domain": ".xiaohongshu.com", "path": "/" },
    { "name": "web_session", "value": "YOUR_VALUE", "domain": ".xiaohongshu.com", "path": "/" }
  ]
}
```