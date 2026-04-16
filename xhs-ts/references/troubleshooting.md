# Troubleshooting

## Error Code Reference

| Code | Trigger | Solution |
|------|---------|----------|
| `NOT_LOGGED_IN` | Cookie 过期或未登录 | `npm run login` |
| `USER_DATA_CORRUPTED` | 用户数据损坏 | `npm run user -- --cleanup '<用户名>'`，然后重新登录 |
| `RATE_LIMITED` | 操作频率过高 | 等待 30s+ 后重试，增加操作间隔至 2-5s |
| `CAPTCHA_REQUIRED` | 触发验证码 | 手动处理或切换代理 IP |
| `COMMENT_PHONE_REQUIRED` | 未绑定手机号 | 绑定手机号或使用已绑定账号 |
| `URL_MISSING_TOKEN` | URL 无 xsec_token | 通过 `npm run search` 获取完整 URL |
| `NOT_FOUND` | 资源不存在 | 检查 URL 格式，确认笔记/用户存在 |
| `LOGIN_FAILED` | 登录失败 | 重试或手动导入 Cookie；检查网络 |
| `BROWSER_ERROR` | 浏览器启动失败 | 检查 Playwright 安装：`npm run install:browser` |

---

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
- If `USER_DATA_CORRUPTED` appears, run cleanup first:
  ```bash
  npm run user -- --cleanup '<用户名>'
  npm run login -- --user '<用户名>'
  ```

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