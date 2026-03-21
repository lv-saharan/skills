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

# Login config
LOGIN_METHOD=qr        # Login method: qr or sms
LOGIN_TIMEOUT=120000   # Login timeout (ms)

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
| `{baseDir}/cookies.json` | Cookie storage |
| `{baseDir}/tmp/qr_login_*.png` | QR code images (headless mode) |
| `{baseDir}/.env` | Environment configuration |