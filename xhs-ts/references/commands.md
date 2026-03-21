# Command Reference

## Command Format

```bash
npm run <command> [-- options]
```

> Use `--` to separate npm args from script args.

---

## Implemented Commands

### login

Login to Xiaohongshu and save cookies.

```bash
npm run login                    # QR code login (default)
npm run login -- --sms           # SMS login
npm run login -- --headless      # Headless mode (QR saved to file)
npm run login -- --creator       # Login to creator center (required for publish)
```

**Options:**

| Option | Description |
|--------|-------------|
| `--qr` | QR code login (default) |
| `--sms` | SMS login |
| `--headless` | Run in headless mode |
| `--timeout <ms>` | Login timeout |
| `--creator` | Login to creator center |

**Output (success):**

```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Login successful. Cookies saved.",
    "cookieSaved": true
  }
}
```

**Output (QR in headless):**

```json
{
  "type": "qr_login",
  "status": "waiting_scan",
  "qrPath": "/absolute/path/to/tmp/qr_login_20260319_093000.png",
  "message": "请使用小红书 App 扫描二维码登录"
}
```

**Agent handling:** Parse JSON → Use `look_at` tool to read `qrPath` image → Display to user → Wait for scan

---

### search

Search notes by keyword.

```bash
npm run search -- "美食探店"
npm run search -- "美食探店" --limit 10 --sort hot
```

**Options:**

| Option | Default | Description |
|--------|---------|-------------|
| `<keyword>` | (required) | Search keyword |
| `--limit <n>` | 20 | Number of results |
| `--sort <type>` | hot | Sort by: `hot` or `time` |
| `--headless` | false | Run in headless mode |

**Output:**

```json
{
  "success": true,
  "data": {
    "keyword": "美食探店",
    "total": 10,
    "notes": [
      {
        "id": "note-id",
        "title": "笔记标题",
        "author": { "id": "user-id", "name": "作者名", "url": "/user/profile/..." },
        "stats": { "likes": 1000, "collects": 500, "comments": 100 },
        "cover": "https://sns-webpic-qc.xhscdn.com/...",
        "url": "https://www.xiaohongshu.com/explore/note-id?xsec_token=...",
        "xsecToken": "ABssN-ZxEtg2nmmN..."
      }
    ]
  }
}
```

---

### publish

Publish a note (image or video).

```bash
# Image note
npm run publish -- --title "标题" --content "正文" --images "img1.jpg,img2.jpg"

# Video note
npm run publish -- --title "标题" --content "正文" --video "video.mp4"

# With tags
npm run publish -- --title "标题" --content "正文" --images "img1.jpg" --tags "美食,探店"
```

**Options:**

| Option | Required | Description |
|--------|----------|-------------|
| `--title <text>` | Yes | Note title (max 20 chars) |
| `--content <text>` | Yes | Note content (max 1000 chars) |
| `--images <paths>` | Yes* | Image paths, comma-separated (1-9 images) |
| `--video <path>` | Yes* | Video path (max 500MB) |
| `--tags <tags>` | No | Tags, comma-separated (max 10) |
| `--headless` | No | Run in headless mode |

> *Either `--images` or `--video` is required.

**Supported formats:**

- Images: `.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- Videos: `.mp4`, `.mov`, `.avi`, `.mkv`

**Output (success):**

```json
{
  "success": true,
  "data": {
    "success": true,
    "noteId": "note-id",
    "noteUrl": "https://www.xiaohongshu.com/explore/note-id",
    "message": "Note published successfully"
  }
}
```

---

## Not Yet Implemented

These commands return `NOT_FOUND` error:

```bash
npm run like -- "<url>"           # Like a note
npm run collect -- "<url>"        # Collect a note
npm run comment -- "<url>" "text" # Comment on a note
npm run follow -- "<url>"         # Follow a user
```

Direct CLI commands (not via npm):

```bash
tsx scripts/index.ts scrape-note "<url>"  # Scrape note details
tsx scripts/index.ts scrape-user "<url>"   # Scrape user profile
```

---

## Error Response Format

All errors return JSON to stderr:

```json
{
  "error": true,
  "message": "Error description",
  "code": "ERROR_CODE"
}
```

**Error Codes:**

| Code | Description |
|------|-------------|
| `NOT_LOGGED_IN` | Not logged in or cookie expired |
| `RATE_LIMITED` | Rate limit triggered |
| `NOT_FOUND` | Resource not found or command not implemented |
| `NETWORK_ERROR` | Network error |
| `CAPTCHA_REQUIRED` | Captcha required |
| `COOKIE_EXPIRED` | Cookie expired |
| `LOGIN_FAILED` | Login failed |
| `BROWSER_ERROR` | Browser error |