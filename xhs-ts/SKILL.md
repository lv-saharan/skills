---
name: xhs-ts
description: |
  Automate Xiaohongshu (小红书/Red) — search notes, publish content, interact (like/collect/comment/follow), scrape data, manage multiple accounts.
  Use when user mentions 小红书, xhs, Xiaohongshu, Red, 小红书账号, 笔记发布, 搜索笔记, 
  小红书数据, 红书, RedNote, 小红书运营, 小红书自动化, or wants to login/search/publish/interact/scrape on Xiaohongshu.
  Supports content creation, competitive monitoring, multi-account management, and data extraction.
license: MIT
compatibility: opencode
metadata:
  version: "0.0.7"
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
| Scrape note | `npm run start -- scrape-note "<url>"` | ✅ Implemented |
| Scrape user | `npm run start -- scrape-user "<url>"` | ✅ Implemented |

> All commands support `--user <name>` for multi-account operations.

---

## Gotchas

1. **Headless auto-detection** — Linux servers (no DISPLAY) automatically force headless mode
2. **QR code file path** — In headless mode, QR code saved to `users/{user}/tmp/qr_login_*.png`
3. **Rate limiting** — Keep 2-5 second intervals between operations to avoid detection
4. **URL must include xsec_token** — Note URLs from search results include this token; direct URLs may not work
5. **Comment requires phone binding** — Accounts without phone number cannot comment
6. **Multi-user support** — Use `--user <name>` to operate with different accounts
7. **Short links not supported** — xhslink.com URLs are not supported, use full URLs

---

## Multi-User Management

xhs-ts supports multiple Xiaohongshu accounts with isolated cookies and temporary files.

### Directory Structure

```
xhs-ts/
├── users/                    # Multi-user directory
│   ├── users.json            # User metadata (current user)
│   ├── default/              # Default user
│   │   ├── cookies.json      # Cookies
│   │   └── tmp/              # Temporary files (QR codes)
│   ├── 小号/                 # User "小号"
│   │   ├── cookies.json
│   │   └── tmp/
│   └── ...
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

# Login with specific user
npm run login -- --user "小号"

# Search with specific user
npm run search -- "美食" --user "小号"
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

### Channel-Specific Formatting

> **详细格式和发送流程见 [@references/channel-integration.md](references/channel-integration.md)**

| 渠道 | 格式 | 关键要点 |
|------|------|----------|
| **飞书** | 交互卡片 + 链接（两条消息） | URL 用反引号包裹；间隔 600ms+ |

**飞书卡片示例（小红书搜索结果）：**

![飞书卡片示例](assets/feishu-card.png)
| **微信个人号** | 文字 + 图片（逐条发送） | 文字在前；每次只发一条，等待返回 |
| **企业微信** | 图文 news 或 Markdown | `picurl` 可直接用图片 URL |

**飞书卡片交互**：
- ⚠️ **自定义机器人不支持交互回调**，按钮只能跳转 URL
- 需要**应用机器人** + **长连接事件订阅**才能实现点赞/收藏/关注交互
- 开通步骤：[开发者后台](https://open.feishu.cn/app) 创建应用 → 启用机器人 → 配置事件订阅

**通用要点**：
- URL **必须**包含 `xsec_token` 参数（否则提示"内容不存在")
- 交互按钮回调：`xhs_like`, `xhs_collect`, `xhs_follow`

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

# Login with specific user
npm run login -- --user "小号"
```

### Search

```bash
# Basic search
npm run search -- "美食探店"

# With filters
npm run search -- "美食探店" --limit 10 --sort hot --note-type image --time-range week

# Search followed users only
npm run search -- "美食探店" --scope following
```

> **Output formatting**: For sending results to Feishu/WeChat, see [@references/channel-integration.md](references/channel-integration.md)

| Parameter | Values | Default |
|-----------|--------|---------|
| `--limit` | Any positive integer | `20` |
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
npm run follow -- "url1" "url2" --delay 3000
```

### Scrape

#### Scrape Note

```bash
# Basic scrape
npm run start -- scrape-note "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx"

# Include comments
npm run start -- scrape-note "url" --comments --max-comments 50
```

**Output**: `noteId`, `title`, `content`, `images`, `video`, `author`, `stats`, `tags`, `publishTime`, `location`

#### Scrape User

```bash
# Basic scrape
npm run start -- scrape-user "https://www.xiaohongshu.com/user/profile/userId"

# Include recent notes
npm run start -- scrape-user "url" --notes --max-notes 24
```

**Output**: `userId`, `name`, `avatar`, `bio`, `stats`, `tags`, `recentNotes`

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
- [Channel Integration](references/channel-integration.md)
- [Troubleshooting](references/troubleshooting.md)
