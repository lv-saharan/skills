---
name: douyin-ts
description: |
  Automate Douyin (抖音/TikTok中文版) operations — search videos, publish content,
  interact (like/collect/comment/follow), scrape data, manage multiple accounts.
  Use when user mentions 抖音, douyin, Douyin, or wants to login, search, publish,
  interact, scrape, or manage multiple Douyin accounts.
license: MIT
compatibility: opencode
metadata:
  version: "0.1.0"
  homepage: "https://github.com/lv-saharan/skills/tree/main/douyin-ts"
  openclaw:
    emoji: "🎵"
    requires:
      bins: [node, npx]
    install:
      - id: node
        kind: node
        packages: [playwright, tsx, commander, dotenv]
        label: "Install dependencies (playwright, tsx, commander, dotenv)"
---

# Douyin Automation Skill (douyin-ts)

## Quick Reference

| Task | Command | Status |
|------|---------|--------|
| Login | `npm run login [-- --user <name>]` | ✅ Implemented |
| Search | `npm run search -- "<keyword>" [-- --user <name>]` | 🚧 Stub |
| Publish | `npm run publish -- [options] [-- --user <name>]` | 🚧 Stub |
| User Management | `npm run user` | ✅ Implemented |
| Like | `npm run like -- "url" [urls...] [-- --delay <ms>]` | 🚧 Stub |
| Collect | `npm run collect -- "url" [urls...] [-- --delay <ms>]` | 🚧 Stub |
| Comment | `npm run comment -- "<url>" "<text>"` | 🚧 Stub |
| Follow | `npm run follow -- "url" [urls...] [-- --delay <ms>]` | 🚧 Stub |
| Scrape note | `npm run scrape-note -- "<url>" [-- --comments]` | 🚧 Stub |
| Scrape user | `npm run scrape-user -- "<url>" [-- --notes]` | 🚧 Stub |
| Browser start | `npm run browser -- --start [--user <name>]` | ✅ Implemented |
| Browser status | `npm run browser -- --status` | ✅ Implemented |
| Browser list | `npm run browser -- --list` | ✅ Implemented |
| Browser stop | `npm run browser -- --stop` | ✅ Implemented |

> All commands support `--user <name>` for multi-account operations.
>
> **Usage**: `npm run <command> -- [args] -- [options]`

---

## Gotchas

1. **Headless auto-detection** — Linux servers (no DISPLAY) automatically force headless mode
2. **QR code file path** — In headless mode, QR code saved to `users/{user}/tmp/qr_login_*.png`
3. **Rate limiting** — Keep 2-5 second intervals between operations to avoid detection
4. **Multi-user support** — Use `--user <name>` to operate with different accounts
5. **Short links not supported** — Use full URLs

---

## Multi-User Management

douyin-ts supports multiple Douyin accounts with isolated cookies and temporary files.

### Directory Structure

```
douyin-ts/
├── users/                    # Multi-user directory
│   ├── users.json            # User metadata (current user, version: 2)
│   ├── default/              # Default user
│   │   ├── user-data/        # Playwright persistent context (auto-saves cookies, localStorage)
│   │   ├── profile.json      # Unified Profile data (meta + connection)
│   │   ├── fingerprint.json  # Device fingerprint
│   │   └── tmp/              # Temporary files (QR codes)
│   └── 小号/                 # User "小号"
│       ├── user-data/
│       ├── profile.json
│       ├── fingerprint.json
│       └── tmp/
```

### User Selection Priority

```
--user <name>  >  users.json current  >  default
```

### Commands

```bash
# List all users
npm run user

# Set current user
npm run user:use -- "小号"

# Reset to default user
npm run user -- --set-default

# Login with specific user
npm run login -- --user "小号"
```

---

## Output Format

All commands output JSON to stdout. The `toAgent` field provides **actionable instructions**.

### toAgent Format

```
ACTION[:TARGET][:HINT]
```

| Action | Agent Behavior |
|--------|---------------|
| `DISPLAY_IMAGE` | Use `look_at` to read image, send based on Channel type |
| `RELAY` | Forward message directly to user |
| `WAIT` | Wait for user action, prompt HINT text |
| `PARSE` | Format `data` content and display |

---

## Commands

### Login

```bash
# QR code login (default)
npm run login

# Headless mode (QR saved to file)
npm run login -- --headless

# SMS login
npm run login -- --sms

# SMS login with phone number
npm run login -- --sms --phone "13800138000"

# Cookie string login
npm run login -- --cookie-string "sessionid=xxx;ttwid=xxx"

# Login with specific user
npm run login -- --user "小号"

# Custom timeout (milliseconds)
npm run login -- --timeout 180000

# Reset corrupted user data
npm run login -- --reset-user-data
```

**Options:**

| Option | Description |
|--------|-------------|
| `--qr` | QR code login (default) |
| `--sms` | SMS verification code login |
| `--phone <number>` | Phone number for SMS login |
| `--cookie-string <string>` | Direct cookie string login |
| `--headless` | Run in headless mode |
| `--timeout <ms>` | Login timeout in milliseconds (default: 120000) |
| `--user <name>` | User name for multi-account |
| `--reset-user-data` | Clear corrupted user data before login |

### Search

```bash
# Basic search
npm run search -- "美食探店"

# With filters
npm run search -- "美食探店" --limit 10 --sort hot

# With all filters
npm run search -- "美食探店" --limit 20 --skip 5 --sort time_descending --note-type video --time-range week --scope following --location city
```

**Options:**

| Option | Description | Values | Default |
|--------|-------------|--------|---------|
| `<keyword>` | Search keyword (required) | - | - |
| `--limit <number>` | Number of results | 1-100 | 10 |
| `--skip <number>` | Results to skip | 0+ | 0 |
| `--sort <type>` | Sort type | `general`, `time_descending`, `hot` | general |
| `--note-type <type>` | Video type | `all`, `image`, `video` | all |
| `--time-range <range>` | Time filter | `all`, `day`, `week`, `month` | all |
| `--scope <scope>` | Search scope | `all`, `following` | all |
| `--location <location>` | Location filter | `all`, `nearby`, `city` | all |
| `--headless` | Run in headless mode | - | auto |
| `--user <name>` | User name for multi-account | - | current |

### Publish

```bash
# Publish video
npm run publish -- --title "标题" --content "正文" --video "video.mp4"

# Publish images
npm run publish -- --title "标题" --content "正文" --images "img1.jpg,img2.jpg"

# With tags
npm run publish -- --title "标题" --content "正文" --video "video.mp4" --tags "美食,探店"
```

**Options:**

| Option | Description | Required |
|--------|-------------|----------|
| `--title <title>` | Video title | Yes |
| `--content <content>` | Video content/description | Yes |
| `--images <paths>` | Image paths (comma separated) | No |
| `--video <path>` | Video file path | No |
| `--tags <tags>` | Tags (comma separated) | No |
| `--headless` | Run in headless mode | No |
| `--user <name>` | User name for multi-account | No |

### Interact (Like, Collect, Comment, Follow)

```bash
# Like videos
npm run like -- "url1" "url2"

# Like with custom delay
npm run like -- "url1" "url2" --delay 3000

# Collect videos
npm run collect -- "url1" "url2"

# Comment on video
npm run comment -- "url" "评论内容"

# Follow users
npm run follow -- "url1" "url2"
```

**Like / Collect / Follow Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `[urls...]` | Video or user profile URLs | - |
| `--delay <ms>` | Delay between actions | 2000 |
| `--headless` | Run in headless mode | auto |
| `--user <name>` | User name for multi-account | current |

**Comment Options:**

| Option | Description |
|--------|-------------|
| `<url>` | Video URL (required) |
| `<text>` | Comment text (required) |
| `--headless` | Run in headless mode |
| `--user <name>` | User name for multi-account |

### Scrape

```bash
# Scrape video details
npm run scrape-note -- "url"

# Scrape with comments
npm run scrape-note -- "url" --comments --max-comments 50

# Scrape user profile
npm run scrape-user -- "url"

# Scrape user with videos
npm run scrape-user -- "url" --notes --max-notes 30
```

**Scrape Note Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `<url>` | Video URL (required) | - |
| `--comments` | Include comments in result | false |
| `--max-comments <number>` | Max comments to include | 20 |
| `--headless` | Run in headless mode | auto |
| `--user <name>` | User name for multi-account | current |

**Scrape User Options:**

| Option | Description | Default |
|--------|-------------|---------|
| `<url>` | User profile URL (required) | - |
| `--notes` | Include videos in result | false |
| `--max-notes <number>` | Max videos to include | 12 |
| `--headless` | Run in headless mode | auto |
| `--user <name>` | User name for multi-account | current |

### Browser Management

```bash
# Start browser instance
npm run browser -- --start
npm run browser -- --start --user "小号"
npm run browser -- --start --headless

# Show status
npm run browser -- --status

# List saved connections
npm run browser -- --list

# Stop instances
npm run browser -- --stop-user "小号"
npm run browser -- --stop
```

**Options:**

| Option | Description |
|--------|-------------|
| `--start` | Start a browser instance |
| `--stop` | Stop all browser instances |
| `--stop-user <name>` | Stop browser for specific user |
| `--status` | Show browser status |
| `--list` | List saved connections |
| `--user <name>` | User name (for --start) |
| `--headless` | Run in headless mode (for --start) |

---

## Error Codes

| Code | Description | Action |
|------|-------------|--------|
| `NOT_LOGGED_IN` | Not logged in or cookie expired | Run `npm run login` |
| `RATE_LIMITED` | Rate limit triggered | Wait and retry |
| `NOT_FOUND` | Resource not found | Check URL format |
| `CAPTCHA_REQUIRED` | Captcha detected | Handle manually |
| `LOGIN_FAILED` | Login failed | Retry or manual cookie import |

---

## Anti-Detection

Built-in protection:
- Random delays (2-5s between actions)
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
- [Channel Integration](references/channel-integration.md)
- [Troubleshooting](references/troubleshooting.md)
