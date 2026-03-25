---
name: xhs-ts
description: |
  Automate Xiaohongshu (小红书/Red) — search notes, publish content, manage multiple accounts.
  Use when user mentions 小红书, xhs, Xiaohongshu, Red, 小红书账号, 笔记发布, 搜索笔记, 
  小红书数据, 红书, RedNote, 小红书运营, 小红书自动化, or wants to login/search/publish on Xiaohongshu.
  Supports content creation, competitive monitoring, multi-account management.
license: MIT
compatibility: opencode
metadata:
  version: "0.0.4"
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
| Like | `npm run like -- "<url>"` | ❌ Not implemented |
| Collect | `npm run collect -- "<url>"` | ❌ Not implemented |
| Comment | `npm run comment -- "<url>" "text"` | ❌ Not implemented |
| Follow | `npm run follow -- "<url>"` | ❌ Not implemented |
| Scrape note/user | `npm run start -- scrape-note/user "<url>"` | ❌ Not implemented |

> All commands support `--user <name>` for multi-account operations.

---

## Gotchas

1. **Headless auto-detection** — Linux servers (no DISPLAY) automatically force headless mode
2. **QR code file path** — In headless mode, QR code saved to `users/{user}/tmp/qr_login_*.png`
3. **Rate limiting** — Keep 2-5 second intervals between operations to avoid detection
4. **Search `--scope following`** — Requires login to access followed users' notes
5. **Search filters** — Filters are applied via URL params; some may require UI interaction on page load
6. **Multi-user support** — Use `--user <name>` to operate with different accounts

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
├── cookies.json              # Legacy (migrated on first run)
└── tmp/                      # Legacy (migrated on first run)
```

### User Selection Priority

```
--user <name>  >  users.json current  >  default
```

### Commands

```bash
# List all users
npm run user

# Set current user (shortcut)
npm run user:use -- "小号"

# Set current user (full command)
npm run user -- --set-current "小号"

# Reset to default user
npm run user -- --set-default

# Login with specific user
npm run login -- --user "小号"

# Search with specific user
npm run search -- "美食" --user "小号"

# Publish with specific user
npm run publish -- ... --user "主号"
```

### Migration

On first run after upgrade, existing `cookies.json` and `tmp/` are automatically migrated to `users/default/`. Original files are deleted after successful migration.

---

## Output Format

All commands output JSON to stdout. The `toAgent` field provides **actionable instructions**.

### toAgent Format

```
ACTION[:TARGET][:HINT]
```

| Action | Agent 行为 |
|--------|-----------|
| `DISPLAY_IMAGE` | 使用 `look_at` 读取图片，根据 Channel 类型发送 |
| `RELAY` | 直接转发消息给用户 |
| `WAIT` | 等待用户操作，提示 HINT 文本 |
| `PARSE` | 格式化 `data` 内容并展示 |

**字段引用：** `TARGET` 若匹配同层 JSON 字段名，则取该字段值（如 `DISPLAY_IMAGE:qrPath` 读取 `qrPath` 字段）。

**Channel 适配：** Agent 应根据接入的 Channel（飞书/企业微信/CLI）选择合适的消息格式发送。详见 [Channel Integration Guide](references/channel-integration.md)。

### Response Examples

```json
// QR 码登录
{
  "type": "qr_login",
  "qrPath": "/absolute/path/to/qr.png",
  "toAgent": "DISPLAY_IMAGE:qrPath:WAIT:扫码"
}

// 搜索结果
{
  "success": true,
  "data": { "notes": [...] },
  "toAgent": "PARSE:notes"
}
```

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
# 二维码登录（默认）
npm run login

# 无头模式登录（二维码保存到文件）
npm run login:headless

# 或使用参数方式
npm run login -- --headless

# 短信登录
npm run login -- --sms
```

**参数说明：**

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--qr` | 二维码登录 | ✅ 默认方式 |
| `--sms` | 短信登录 | — |
| `--headless` | 无头模式运行 | `false` |
| `--timeout` | 登录超时时间（毫秒） | `120000` |
| `--user` | 指定用户 | 当前用户 |

### Search

```bash
# 基本搜索
npm run search -- "美食探店"

# 指定结果数量和排序方式
npm run search -- "美食探店" --limit 10 --sort hot

# 筛选图文笔记，发布时间在一周内
npm run search -- "美食探店" --note-type image --time-range week

# 只搜索我关注的用户
npm run search -- "美食探店" --scope following

# 按位置筛选：附近
npm run search -- "美食探店" --location nearby

# 组合筛选：视频笔记 + 一月内发布 + 热度排序 + 同城
npm run search -- "旅游攻略" --limit 20 --sort hot --note-type video --time-range month --location city
```

**参数说明：**

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `<keyword>` | 搜索关键词（必填） | — | — |
| `--limit` | 返回结果数量 | 任意正整数 | `20` |
| `--sort` | 排序方式 | `general`（综合排序）、`time_descending`（最新发布）、`hot`（最热） | `general` |
| `--note-type` | 笔记类型 | `all`（全部）、`image`（图文）、`video`（视频） | `all` |
| `--time-range` | 发布时间 | `all`（不限）、`day`（一天内）、`week`（一周内）、`month`（一月内） | `all` |
| `--scope` | 搜索范围 | `all`（全部）、`following`（我关注的） | `all` |
| `--location` | 位置距离 | `all`（不限）、`nearby`（附近）、`city`（同城） | `all` |
| `--headless` | 无头模式运行 | — | `false` |
| `--user` | 指定用户 | 用户名 | 当前用户 |

**注意事项：**
- `--scope following` 需要先登录
- 所有筛选参数可自由组合

### Publish

```bash
# 发布图文笔记
npm run publish -- --title "标题" --content "正文" --images "img1.jpg,img2.jpg"

# 发布视频笔记
npm run publish -- --title "标题" --content "正文" --video "video.mp4"

# 带标签发布
npm run publish -- --title "标题" --content "正文" --images "img1.jpg" --tags "美食,探店"
```

**参数说明：**

| 参数 | 说明 | 必填 | 默认值 |
|------|------|------|--------|
| `--title` | 笔记标题（最多20字） | ✅ | — |
| `--content` | 笔记正文（最多1000字） | ✅ | — |
| `--images` | 图片路径，逗号分隔（1-9张） | * | — |
| `--video` | 视频路径（最大500MB） | * | — |
| `--tags` | 标签，逗号分隔（最多10个） | ❌ | — |
| `--headless` | 无头模式运行 | ❌ | `false` |
| `--user` | 指定用户 | ❌ | 当前用户 |

> `--images` 与 `--video` 二选一，不可同时使用

**支持格式：**
- 图片：`.jpg`, `.jpeg`, `.png`, `.gif`, `.webp`
- 视频：`.mp4`, `.mov`, `.avi`, `.mkv`

**⚠️ 重要警告：**

小红书可能检测并禁止自动化发布行为。常见情况包括：
- 使用 AI 生成的内容
- 自动化脚本发布
- 高频发布操作

如果遇到"因违反社区规范禁止发笔记"错误，可能是：
1. 账号被标记为自动化账号
2. 内容被识别为 AI 生成
3. 发布频率过高触发风控

**建议：**
- 使用小号测试发布功能
- 内容尽量原创或人工编辑
- 保持合理发布间隔
- 发布失败时检查账号状态

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
- [Channel Integration](references/channel-integration.md) — toAgent 处理与消息格式适配
- [Troubleshooting](references/troubleshooting.md)