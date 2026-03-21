---
name: xhs-ts
description: |
  Xiaohongshu (小红书) automation — search notes, publish content, data scraping.
  Use when user mentions 小红书, xhs, Xiaohongshu, Red, 笔记发布, 搜索笔记, 小红书数据.
  Supports content creation, data analysis, competitive monitoring.
license: MIT
compatibility: opencode
metadata:
  version: "0.0.1"
  openclaw:
    emoji: "📕"
    requires:
      bins: [node, npx]
    install:
      - id: node
        kind: node
        packages: [playwright, tsx, commander, dotenv]
        label: "Install dependencies (playwright, tsx, commander, dotenv)"
---

# Xiaohongshu Automation Skill (xhs-ts)

## Quick Reference

| Task | Command | Status |
|------|---------|--------|
| Login | `npm run login` | ✅ Implemented |
| Search | `npm run search -- "<keyword>"` | ✅ Implemented |
| Publish | `npm run publish -- [options]` | ✅ Implemented |
| Like | `npm run like -- "<url>"` | ❌ Not implemented |
| Collect | `npm run collect -- "<url>"` | ❌ Not implemented |
| Comment | `npm run comment -- "<url>" "text"` | ❌ Not implemented |
| Follow | `npm run follow -- "<url>"` | ❌ Not implemented |
| Scrape note/user | `npm run start -- scrape-note/user "<url>"` | ❌ Not implemented |

---

## Gotchas

1. **Publish requires creator login** — Run `npm run login -- --creator` separately from main site login
2. **Headless auto-detection** — Linux servers (no DISPLAY) automatically force headless mode
3. **QR code file path** — In headless mode, QR code saved to `{baseDir}/tmp/qr_login_*.png`
4. **Rate limiting** — Keep 2-5 second intervals between operations to avoid detection

---

## Output Format

All commands output JSON to stdout. The `toAgent` field provides **actionable instructions** for the agent.

### toAgent Format

```
ACTION[:TARGET][:HINT]
```

| Action | Meaning | Example |
|--------|---------|---------|
| `DISPLAY_IMAGE` | Show image to user | `DISPLAY_IMAGE:qrPath` |
| `RELAY` | Relay message to user | `RELAY:发布成功` |
| `WAIT` | Wait for user action | `WAIT:扫码` |
| `PARSE` | Parse and present data | `PARSE:notes` |

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "toAgent": "RELAY:操作成功"
}
```

### Error Response

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

### QR Code (Headless Login)

```json
{
  "type": "qr_login",
  "status": "waiting_scan",
  "qrPath": "/absolute/path/to/tmp/qr_login_YYYYMMDD_HHmmss.png",
  "message": "请使用小红书 App 扫描二维码登录",
  "toAgent": "DISPLAY_IMAGE:qrPath:WAIT:扫码"
}
```

**Agent handling:**
1. Parse `toAgent`: `DISPLAY_IMAGE:qrPath:WAIT:扫码`
2. Use `look_at` tool to read the image at `qrPath`
3. Display to user
4. Wait for scan

---

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `NOT_LOGGED_IN` | Not logged in or cookie expired | Run `npm run login` |
| `RATE_LIMITED` | Rate limit triggered | Wait and retry |
| `NOT_FOUND` | Resource not found or command not implemented | Check URL or command |
| `NETWORK_ERROR` | Network error | Check network/proxy |
| `CAPTCHA_REQUIRED` | Captcha detected | Handle manually |
| `COOKIE_EXPIRED` | Cookie expired | Re-login |
| `LOGIN_FAILED` | Login failed | Retry or manual cookie import |
| `BROWSER_ERROR` | Browser error | Check Playwright installation |

---

## Commands

### Login

```bash
npm run login                      # QR code login (default)
npm run login -- --sms             # SMS login
npm run login -- --headless        # Headless mode (QR saved to file)
npm run login -- --creator         # Login to creator center (required for publish)
```

**Options:** `--qr`, `--sms`, `--headless`, `--timeout <ms>`, `--creator`

### Search

```bash
npm run search -- "美食探店" --limit 10 --sort hot
```

**Parameters:**
- `<keyword>` (required) — Search keyword
- `--limit <n>` — Number of results (default: 20)
- `--sort <type>` — `hot` or `time` (default: hot)
- `--headless` — Run in headless mode

### Publish

```bash
# Image note
npm run publish -- --title "标题" --content "正文" --images "img1.jpg,img2.jpg"

# Video note
npm run publish -- --title "标题" --content "正文" --video "video.mp4"

# With tags
npm run publish -- --title "标题" --content "正文" --images "img1.jpg" --tags "美食,探店"
```

**Parameters:**
- `--title <text>` (required) — Title (max 20 chars)
- `--content <text>` (required) — Content (max 1000 chars)
- `--images <paths>` — Image paths, comma-separated (1-9 images)
- `--video <path>` — Video path (max 500MB) — mutually exclusive with `--images`
- `--tags <tags>` — Tags, comma-separated (max 10)
- `--headless` — Run in headless mode

**Supported formats:**
- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Videos: `.mp4`, `.mov`, `.avi`, `.mkv`

---

## Not Implemented

The following commands return `NOT_FOUND` error:

```bash
npm run like -- "<url>"
npm run collect -- "<url>"
npm run comment -- "<url>" "text"
npm run follow -- "<url>"
```

---

## Anti-Detection

Built-in protection:
- Random delays (1-3s between actions)
- Mouse trajectory randomization
- Rate limiting prevention
- Captcha detection

**Best practices:**
- Keep 2-5 second intervals between operations
- Use proxy IP for high-frequency operations
- Test with secondary account

---

## References

- [Installation Guide](references/installation.md)
- [Configuration](references/configuration.md)
- [Command Reference](references/commands.md)
- [Troubleshooting](references/troubleshooting.md)