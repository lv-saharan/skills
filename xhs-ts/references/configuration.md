# Configuration Guide

## Environment Variables

Create `.env` file in `{baseDir}/`:

```env
# Proxy (optional)
PROXY=http://127.0.0.1:7890

# Headless mode
# - Empty/not set: Auto-detect (headless on servers, headed on desktop)
# - true: Force headless
# - false: Force headed
HEADLESS=

# Browser path (optional, uses Playwright's built-in by default)
BROWSER_PATH=

# Debug mode
DEBUG=false
```

## Headless Auto-Detection

| Environment | HEADLESS Value |
|-------------|----------------|
| Linux server (no DISPLAY) | **Forced true** |
| Windows/macOS/Linux with GUI | Uses .env setting (default: false) |

## File Locations

| File | Purpose |
|------|---------|
| `{baseDir}/users/{user}/user-data/` | Playwright persistent context (auto-saves cookies, localStorage) |
| `{baseDir}/users/{user}/profile.json` | Unified Profile data (meta + connection) |
| `{baseDir}/users/{user}/fingerprint.json` | Device fingerprint |
| `{baseDir}/users/{user}/tmp/` | Temporary files (QR codes) |
| `{baseDir}/users.json` | User metadata (current user, version: 3) |
| `{baseDir}/.env` | Environment configuration |

## Browser Management

Browser instances are managed via CDP (Chrome DevTools Protocol). Connection info is stored in `profile.json` under the `connection` field.

**Commands:**

```bash
npm run browser -- --start    # Start browser instance
npm run browser -- --status   # Show instance status
npm run browser -- --list     # List saved connections
npm run browser -- --stop     # Stop all instances
```

See [Browser Management](commands.md#browser-management) for details.