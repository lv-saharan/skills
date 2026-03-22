---
name: xhs-ts
description: |
  Xiaohongshu (小红书) automation — search notes, publish content, data scraping.
  Use when user mentions 小红书, xhs, Xiaohongshu, Red, 笔记发布, 搜索笔记, 小红书数据.
  Supports content creation, data analysis, competitive monitoring.
license: MIT
compatibility: opencode
metadata:
  version: "0.0.2"
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
5. **Search `--scope following`** — Requires login to access followed users' notes
6. **Search filters** — Filters are applied via URL params; some may require UI interaction on page load

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
# 二维码登录（默认）
npm run login

# 短信登录
npm run login -- --sms

# 无头模式（二维码保存到文件）
npm run login -- --headless

# 登录创作者中心（发布笔记必需）
npm run login -- --creator
```

**参数说明：**

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--qr` | 二维码登录 | ✅ 默认方式 |
| `--sms` | 短信登录 | — |
| `--headless` | 无头模式运行 | `false` |
| `--timeout` | 登录超时时间（毫秒） | `120000` |
| `--creator` | 登录创作者中心 | — |

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
- [Troubleshooting](references/troubleshooting.md)