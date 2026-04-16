---name: xhs-ts
description: |
  Automate Xiaohongshu (小红书/RedNote) operations via Playwright CLI — search notes,
  publish image/video posts, interact (like/collect/comment/follow), scrape data,
  manage multiple accounts with isolated cookies and anti-detection.
  Use when user mentions 小红书, xhs, Xiaohongshu, RedNote, 红书, 小红书运营,
  or works with xhs-ts/ directory, or wants to login, search, publish, interact,
  scrape, or manage multiple Xiaohongshu accounts.
license: MIT
compatibility: opencode
metadata:
  version: "0.1.1"
  homepage: "https://github.com/lv-saharan/skills/tree/main/xhs-ts"
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
| Login | `npm run login [-- --user <name>]` | ✅ Implemented |
| Search | `npm run search -- "<keyword>" [-- --user <name>]` | ✅ Implemented |
| Publish | `npm run publish -- [options] [-- --user <name>]` | ✅ Implemented |
| User Management | `npm run user` | ✅ Implemented |
| Like | `npm run like -- "<url>" [urls...] [-- --user <name>]` | ✅ Implemented |
| Collect | `npm run collect -- "<url>" [urls...] [-- --user <name>]` | ✅ Implemented |
| Comment | `npm run comment -- "<url>" "text"` | ✅ Implemented |
| Follow | `npm run follow -- "<url>" [urls...]` | ✅ Implemented |
| Scrape note | `npm run scrape-note -- "<url>"` | ✅ Implemented |
| Scrape user | `npm run scrape-user -- "<url>"` | ✅ Implemented |
| Browser start | `npm run browser -- --start [--user <name>]` | ✅ Implemented |
| Browser status | `npm run browser -- --status` | ✅ Implemented |
| Browser stop | `npm run browser -- --stop` | ✅ Implemented |

> All commands support `--user <name>` for multi-account operations.
> 
> **Usage**: `npm run <command> -- [args] -- [options]`
> 
> Example: `npm run search -- "美食" -- --limit 10 --user "小号"`

---

## Gotchas

### Authentication
1. **Cookie expiry** — Session cookies expire after ~30 days; `NOT_LOGGED_IN` → run `npm run login`
2. **Comment requires phone binding** — Unbound accounts get `评论受限: 绑定手机`
3. **URL must include xsec_token** — Direct URLs may not work; use `npm run search` to get complete URLs

### Anti-Detection
4. **Rate limiting** — Keep 2-5 second intervals between operations
5. **Headless auto-detection** — Linux servers (no DISPLAY) automatically force headless mode
6. **QR code file path** — Headless mode: QR saved to `users/{user}/tmp/qr_login_*.png`

### Platform Limits
7. **Short links not supported** — xhslink.com URLs will fail; use full URLs
8. **Publish detection risk** — Xiaohongshu may block automated publishing; test with secondary account

---

## Multi-User Management

xhs-ts supports multiple Xiaohongshu accounts with isolated cookies and temporary files.

### Directory Structure

```
xhs-ts/
├── users/                    # Multi-user directory
│   ├── users.json            # User metadata (current user, version: 3)
│   ├── default/              # Default user
│   │   ├── user-data/        # Playwright persistent context (auto-saves cookies, localStorage)
│   │   ├── profile.json      # Unified Profile data (meta + connection)
│   │   ├── fingerprint.json  # Device fingerprint
│   │   └── tmp/              # Temporary files (QR codes)
│   └── {username}/           # Same structure as default/
│       ├── user-data/
│       ├── profile.json
│       ├── fingerprint.json
│       └── tmp/
```

> **Version 3 Changes**: `meta.json` merged into `profile.json` with `meta` and `connection` fields.

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
# Or: npm run user -- --set-current "小号"

# Reset to default user
npm run user -- --set-default

# Clean up corrupted user data (when login fails with USER_DATA_CORRUPTED)
npm run user -- --cleanup '<用户名>'

# Login with specific user
npm run login -- --user "小号"

# Search with specific user
npm run search -- "美食" --user "小号"
```

### Error Recovery: Corrupted User Data

When login fails with `USER_DATA_CORRUPTED` error, the output includes `suggestCleanup: true`:

```json
{
  "error": true,
  "code": "USER_DATA_CORRUPTED",
  "suggestCleanup": true,
  "canCleanup": true,
  "hint": "用户数据可能已损坏。请运行 npm run user -- --cleanup <用户名> 清理后重新登录。"
}
```

**Agent workflow:**
1. Detect `suggestCleanup: true` in error output
2. Ask user: "用户数据可能已损坏，是否执行清理？"
3. If user confirms: run `npm run user -- --cleanup <用户名>`
4. After cleanup succeeds: run `npm run login -- --user <用户名>`

> **Safety check**: Cleanup is blocked (`canCleanup: false`) if browser is running for that user. Close browser first with `npm run browser -- --stop-user <用户名>`.

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

### Channel-Specific Formatting

When `toAgent` is `PARSE:notes`, format output based on channel type:

| Channel | Format | Key Rule |
|---------|--------|----------|
| **飞书** | 交互卡片 + 反引号URL（逐条循环） | 每条 2 条消息；间隔 600ms+ |
| **微信个人号** | 文字 + 图片（逐条发送） | 文字在前；每次一条，等待返回 |
| **企业微信** | 图文 news 或 Markdown | `picurl` 直接用 |
| **CLI** | 表格 | 标准输出 |

> **完整格式规范、JSON 模板、回调处理见 [references/channel-integration.md](references/channel-integration.md)**

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

# Cookie string login (direct import)
npm run login -- --cookie-string "a1=xxx; webId=xxx; ..."

# Login with specific user
npm run login -- --user "小号"

```

| Parameter | Values | Default |
|-----------|--------|---------|
| `--qr` | QR code login | ✅ Default |
| `--sms` | SMS login | — |
| `--phone` | Phone number for SMS | — |
| `--cookie-string` | Cookie string for direct login | — |
| `--headless` | Run in headless mode | `false` |
| `--timeout` | Login timeout (ms) | `120000` |
| `--user` | User name | current user |

### Search

```bash
# Basic search
npm run search -- "美食探店"

# With filters
npm run search -- "美食探店" --limit 10 --sort hot --note-type image --time-range week

# Search followed users only
npm run search -- "美食探店" --scope following
```

> **Output formatting**: For sending results to Feishu/WeChat, see [references/channel-integration.md](references/channel-integration.md)

| Parameter | Values | Default |
|-----------|--------|---------|
| `--limit` | Any positive integer | `10` |
| `--skip` | Non-negative integer | `0` |
| `--sort` | `general`, `time_descending`, `hot` | `general` |
| `--note-type` | `all`, `image`, `video` | `all` |
| `--time-range` | `all`, `day`, `week`, `month` | `all` |
| `--scope` | `all`, `following` | `all` |
| `--location` | `all`, `nearby`, `city` | `all` |

### Publish

```bash
# Publish image note
npm run publish -- --title "标题" --content "正文" --images "img1.jpg,img2.jpg"

# Publish video note
npm run publish -- --title "标题" --content "正文" --video "video.mp4"

# With tags
npm run publish -- --title "标题" --content "正文" --images "img1.jpg" --tags "美食,探店"
```

> ⚠️ **Warning**: Xiaohongshu may detect and block automated publishing. Use secondary account for testing.

### Interact (Like, Collect, Comment, Follow)

All interact commands require:
- **Login**: Must be logged in
- **Valid URL**: URLs must include `xsec_token` parameter

> Use `npm run search` to get complete URLs with tokens.

#### Like

```bash
# Single note
npm run like -- "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx"

# Multiple notes (batch)
npm run like -- "url1" "url2" "url3"

# Custom delay between likes (default: 2000ms)
npm run like -- "url1" "url2" --delay 3000
```

#### Collect (Bookmark)

```bash
# Single note
npm run collect -- "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx"

# Multiple notes (batch)
npm run collect -- "url1" "url2"

# Custom delay between collects (default: 2000ms)
npm run collect -- "url1" "url2" --delay 3000
```

#### Comment

```bash
# Comment on a note
npm run comment -- "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx" "评论内容"

# With specific user
npm run comment -- "url" "评论内容" --user "小号"
```

> ⚠️ **Phone Binding Required**: Accounts without phone number cannot comment. Error: `评论受限: 绑定手机`

#### Follow

```bash
# Follow single user
npm run follow -- "https://www.xiaohongshu.com/user/profile/userId"

# Follow multiple users (batch)
npm run follow -- "url1" "url2"

# Custom delay between follows (default: 2000ms)
npm run follow -- "url1" "url2" --delay 3000
```

### Scrape

#### Scrape Note

```bash
# Basic scrape
npm run scrape-note -- "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx"

# Include comments
npm run scrape-note -- "url" --comments --max-comments 50
```

| Parameter | Values | Default |
|-----------|--------|---------|
| `--comments` | Include comments in output | `false` |
| `--max-comments` | Max comments to fetch | `20` |

**Output**: `noteId`, `title`, `content`, `images`, `video`, `author`, `stats`, `tags`, `publishTime`, `location`

#### Scrape User

```bash
# Basic scrape
npm run scrape-user -- "https://www.xiaohongshu.com/user/profile/userId"

# Include recent notes
npm run scrape-user -- "url" --notes --max-notes 24
```

| Parameter | Values | Default |
|-----------|--------|---------|
| `--notes` | Include recent notes in output | `false` |
| `--max-notes` | Max notes to fetch | `12` |

**Output**: `userId`, `name`, `avatar`, `bio`, `stats`, `tags`, `recentNotes`

### Browser Management

Browser instances run in detached mode and persist after CLI exits. **Agent is responsible for closing idle browsers.**

```bash
# Start browser instance
npm run browser -- --start
npm run browser -- --start --user "小号"
npm run browser -- --start --headless

# Show status (includes lastActivityAt timestamp)
npm run browser -- --status

# List saved connections
npm run browser -- --list

# Stop instances
npm run browser -- --stop-user "小号"  # Stop specific user
npm run browser -- --stop              # Stop all instances
```

| Parameter | Description |
|-----------|-------------|
| `--start` | Start a browser instance |
| `--stop` | Stop all browser instances |
| `--stop-user <name>` | Stop browser for specific user |
| `--status` | Show browser status (includes `lastActivityAt`) |
| `--list` | List saved CDP connections |
| `--user <name>` | User name (for `--start`) |
| `--headless` | Run in headless mode |

> **Agent Responsibility**: Check `lastActivityAt` from `--status` output. Close idle browsers (e.g., inactive for 20+ minutes) to free resources.

---

## Agent Workflow

### Typical User Requests

| User says | Agent should |
|-----------|-------------|
| "搜索 XX" | `npm run search -- "XX"` → 根据 Channel 格式化输出 |
| "帮我点赞这个笔记" | 验证 URL 含 `xsec_token` → `npm run like -- "<url>"` |
| "发布一篇笔记" | `npm run publish -- --title ... --content ... --images ...` |
| "抓取这个笔记的数据" | `npm run scrape-note -- "<url>"` |
| "切换账号" | `npm run user:use -- "<name>"` 或 `npm run login -- --user "<name>"` |

### Error Handling Flow

1. 命令返回 `NOT_LOGGED_IN` → `npm run login`
2. 命令返回 `USER_DATA_CORRUPTED` → 询问用户 → `npm run user -- --cleanup`
3. 命令返回 `RATE_LIMITED` → 等待 30s → 重试
4. 浏览器空闲 20+ 分钟 → `npm run browser -- --stop`

> Full error code reference: [references/troubleshooting.md](references/troubleshooting.md)

---

## References

- [Installation Guide](references/installation.md)
- [Configuration](references/configuration.md)

- [Channel Integration](references/channel-integration.md)
- [Troubleshooting](references/troubleshooting.md)
