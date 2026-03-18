---
name: xhs-ts
description: "小红书自动化操作技能。支持搜索笔记、发布内容、互动操作、数据抓取。当用户提到「小红书」、「xhs」、「笔记发布」、「搜索笔记」、「小红书数据」、「抓取小红书」、「小红书爬虫」、「Xiaohongshu」、「Red（小红书）」时触发此技能。适用于内容创作、数据分析、竞品监控等场景。"
license: MIT
compatibility: opencode
metadata:
  version: "0.0.1"
  openclaw:
    emoji: "\U0001F4D5"
    requires:
      bins: [node, npx]
    install:
      - id: node
        kind: node
        packages: [playwright, tsx, commander, dotenv]
        label: "Install dependencies (playwright, tsx, commander, dotenv)"
---

# 小红书自动化 Skill (xhs-ts)

小红书（Xiaohongshu）全功能自动化技能，支持搜索、发布、互动、数据抓取等功能。

## Quick Reference

| 任务 | 命令 | 说明 |
|------|------|------|
| 登录 | `xhs login` | 扫码/短信登录，保存 Cookie |
| 搜索 | `xhs search <keyword>` | 关键词搜索笔记 |
| 发布 | `xhs publish` | 发布图文/视频笔记 |
| 点赞 | `xhs like <url>` | 点赞笔记 |
| 收藏 | `xhs collect <url>` | 收藏笔记 |
| 评论 | `xhs comment <url> <text>` | 评论笔记 |
| 关注 | `xhs follow <url>` | 关注用户 |
| 抓取笔记 | `xhs scrape-note <url>` | 抓取笔记详情 |
| 抓取用户 | `xhs scrape-user <url>` | 抓取用户主页数据 |

---

## Installation

### Prerequisites

- Node.js >= 18
- npm 或 pnpm

### Step 1: Install Dependencies

```bash
cd {baseDir}
npm install
```

### Step 2: Install Playwright Browser

```bash
npx playwright install chromium
```

**国内用户可设置镜像加速：**

```bash
# Windows
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
npx playwright install chromium

# macOS/Linux
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npx playwright install chromium
```

### Step 3: Verify Installation

```bash
npx tsx scripts/index.ts --help
```

---

## Configuration

### Environment Variables (`.env`)

在 `{baseDir}/.env` 文件中配置：

```env
# 代理设置（可选）
PROXY=http://127.0.0.1:7890

# 无头模式（默认 true）
HEADLESS=true

# 浏览器路径（可选，默认使用 Playwright 内置浏览器）
BROWSER_PATH=
```

### Cookie Storage

- Cookie 存储位置：`{baseDir}/cookies.json`
- 支持手动导入 Cookie 文件

---

## Usage

### Basic Command Format

```bash
npx tsx {baseDir}/scripts/index.ts <command> [options]
```

或配置 npm script 后：

```bash
npm run xhs <command> [options]
```

---

## Commands

### Login

首次使用需要登录：

```bash
xhs login
```

**支持的登录方式：**
- 扫码登录（默认）：打开浏览器显示二维码
- 短信验证登录：`xhs login --sms`

**手动导入 Cookie：**

1. 浏览器登录小红书
2. F12 → Application → Cookies → xiaohongshu.com
3. 复制关键 Cookie（a1, web_session 等）
4. 创建 `{baseDir}/cookies.json`：

```json
{
  "cookies": [
    { "name": "a1", "value": "你的值", "domain": ".xiaohongshu.com", "path": "/" },
    { "name": "web_session", "value": "你的值", "domain": ".xiaohongshu.com", "path": "/" }
  ]
}
```

---

### Search Notes

```bash
xhs search <keyword> [--limit 20] [--sort hot|time]
```

**Parameters:**
- `keyword`: 搜索关键词（必需）
- `--limit`: 返回结果数量，默认 20
- `--sort`: 排序方式，`hot` 热门优先，`time` 时间优先

**Example:**

```bash
xhs search "美食探店" --limit 10 --sort hot
```

**Output:**

```json
{
  "keyword": "美食探店",
  "total": 10,
  "notes": [
    {
      "id": "note-id",
      "title": "笔记标题",
      "author": { "id": "user-id", "name": "作者名" },
      "stats": { "likes": 1000, "collects": 500, "comments": 100 },
      "url": "https://www.xiaohongshu.com/explore/note-id"
    }
  ]
}
```

---

### Publish Note

```bash
xhs publish --title "标题" --content "正文" --images "img1.jpg,img2.jpg"
```

**Parameters:**
- `--title`: 笔记标题（必需）
- `--content`: 笔记正文
- `--images`: 图片路径，多个用逗号分隔
- `--video`: 视频路径（与 images 二选一）
- `--tags`: 标签，多个用逗号分隔

**Example:**

```bash
xhs publish --title "今日探店" --content "这家店超好吃！" --images "./photos/1.jpg,./photos/2.jpg" --tags "美食,探店"
```

---

### Interactions

#### Like Note

```bash
xhs like <note-url>
```

#### Collect Note

```bash
xhs collect <note-url>
```

#### Comment on Note

```bash
xhs comment <note-url> "评论内容"
```

#### Follow User

```bash
xhs follow <user-url>
```

**Output:**

```json
{
  "success": true,
  "action": "like",
  "targetId": "note-id",
  "message": "操作成功"
}
```

---

### Data Scraping

#### Scrape Note Details

```bash
xhs scrape-note <note-url>
```

**Output:**

```json
{
  "id": "note-id",
  "title": "标题",
  "content": "正文内容",
  "images": ["url1", "url2"],
  "author": {
    "id": "user-id",
    "name": "作者名",
    "followers": 10000
  },
  "stats": {
    "likes": 1000,
    "collects": 500,
    "comments": 100
  },
  "tags": ["美食", "探店"],
  "publishTime": "2024-01-01T12:00:00Z"
}
```

#### Scrape User Profile

```bash
xhs scrape-user <user-url>
```

**Output:**

```json
{
  "id": "user-id",
  "name": "用户名",
  "bio": "个人简介",
  "avatar": "头像URL",
  "stats": {
    "followers": 10000,
    "following": 500,
    "notes": 100
  },
  "tags": ["美食博主", "探店达人"]
}
```

---

## Anti-Detection Features

内置以下风控防护机制：

| 机制 | 说明 |
|------|------|
| 随机延迟 | 操作间 1-3 秒随机等待，模拟人类行为 |
| 鼠标轨迹随机化 | 非直线移动，模拟真实操作 |
| 请求频率限制 | 防止高频操作触发风控 |
| 验证码处理 | 自动识别并处理验证码弹出 |

**建议：**
- 避免短时间内大量操作
- 每次操作间隔保持在 2-5 秒
- 使用代理 IP 分散请求

---

## Error Handling

所有错误以 JSON 格式返回：

```json
{
  "error": true,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

**Common Error Codes:**

| Code | 说明 | 解决方案 |
|------|------|----------|
| `NOT_LOGGED_IN` | 未登录或 Cookie 过期 | 执行 `xhs login` 重新登录 |
| `RATE_LIMITED` | 触发频率限制 | 等待一段时间后重试 |
| `NOT_FOUND` | 资源不存在 | 检查 URL 是否正确 |
| `NETWORK_ERROR` | 网络错误 | 检查网络连接或代理设置 |
| `CAPTCHA_REQUIRED` | 需要验证码 | 手动处理或使用代理 |

---

## Project Structure

```
xhs-ts/
├── SKILL.md           # 技能定义文件
├── README.md          # 详细文档
├── package.json       # 依赖配置
├── tsconfig.json      # TypeScript 配置
├── .env.example       # 环境变量示例
├── scripts/
│   ├── index.ts       # CLI 入口
│   ├── browser.ts     # 浏览器管理
│   ├── login.ts       # 登录功能
│   ├── search.ts      # 搜索功能
│   ├── publish.ts     # 发布功能
│   ├── interact.ts    # 互动功能
│   ├── scrape.ts      # 抓取功能
│   ├── types.ts       # 类型定义
│   └── utils/
│       ├── anti-detect.ts  # 反检测工具
│       └── helpers.ts      # 通用工具
└── cookies.json       # Cookie 存储（运行时生成）
```

---

## Important Notes

⚠️ **使用前请务必注意：**

1. **频率控制** - 避免短时间内大量操作
2. **账号安全** - 建议使用小号测试
3. **合规使用** - 遵守小红书用户协议
4. **Cookie 有效期** - 定期检查登录状态
5. **代理使用** - 高频操作建议使用代理 IP

---

## Troubleshooting

### Playwright Browser Installation Failed

```bash
# 设置镜像
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
npx playwright install chromium
```

### Login Failed

- 检查网络连接
- 确认小红书 App 已更新
- 尝试手动导入 Cookie

### Search Returns Empty

- 检查 Cookie 是否有效
- 确认关键词是否正确
- 检查网络连接

### TypeScript Errors

```bash
rm -rf node_modules
npm install
```