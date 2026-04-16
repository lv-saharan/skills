# Installation Guide

## Prerequisites

- Node.js >= 22.16.0 (required for `using` syntax)
- npm or pnpm

### Pre-Installation Check

```bash
# Verify Node.js version (requires >= 22.16.0)
node -v

# If version is too low, upgrade:
# macOS: brew install node@22
# Windows: download from nodejs.org
```

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

### Post-Installation Verification

```bash
# Verify all commands are available
npm run start -- --help

# Verify browser installation
npx playwright install --dry-run
```

## Login

The Profile architecture automatically manages session state. Simply run:

```bash
npm run login
```

This will:
1. Create a user profile in `users/default/`
2. Launch a browser with persistent context
3. Auto-save cookies and localStorage to `users/default/user-data/`

No manual cookie import needed.

**Browser Management:**

Browser instances persist after CLI exits and are reused automatically:

```bash
# Start browser instance
npm run browser -- --start

# Check status
npm run browser -- --status

# Stop all instances
npm run browser -- --stop
```

See [Browser Management](#browser-management) for details.