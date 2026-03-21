# Troubleshooting

## Playwright Browser Installation Failed

```bash
# Set mirror (China)
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
npx playwright install chromium
```

## Login Failed

- Check network connection
- Ensure Xiaohongshu app is updated
- Try manual cookie import (see [installation.md](installation.md))

## Search Returns Empty

- Check if cookies are valid
- Verify keyword is correct
- Check network/proxy settings

## QR Code Not Found (Headless)

- Check `tmp/` directory exists
- Verify `qrPath` in output JSON

## TypeScript Errors

```bash
rm -rf node_modules
npm install
```

## Common Issues

| Issue | Solution |
|-------|----------|
| `NOT_LOGGED_IN` | Run `npm run login` |
| `RATE_LIMITED` | Wait and retry. Keep 2-5s intervals between operations |
| `CAPTCHA_REQUIRED` | Handle manually or use proxy |
| `COOKIE_EXPIRED` | Re-login |