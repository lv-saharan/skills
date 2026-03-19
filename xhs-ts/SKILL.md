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
| 登录（有头） | `npm run login` | 浏览器显示二维码扫码登录 |
| 登录（无头） | `npm run login:headless` | 二维码 JSON 输出，供 OpenClaw 展示 |
| 搜索 | `npm run search -- "<keyword>"` | 关键词搜索笔记 |
| 发布 | `npm run publish -- [options]` | 发布图文/视频笔记 |
| 点赞 | `npm run start -- like "<url>"` | 点赞笔记 |
| 收藏 | `npm run start -- collect "<url>"` | 收藏笔记 |
| 评论 | `npm run start -- comment "<url>" "<text>"` | 评论笔记 |
| 关注 | `npm run start -- follow "<url>"` | 关注用户 |
| 抓取笔记 | `npm run scrape -- note "<url>"` | 抓取笔记详情 |
| 抓取用户 | `npm run scrape -- user "<url>"` | 抓取用户主页数据 |

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
npm run install:browser
```

**国内用户可设置镜像加速：**

```bash
# Windows
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright && npm run install:browser

# macOS/Linux
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npm run install:browser
```

### Step 3: Verify Installation

```bash
npm run start -- --help
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

# 登录配置
LOGIN_METHOD=qr        # 登录方式: qr 或 sms
LOGIN_TIMEOUT=120000   # 登录超时（毫秒）

# 调试模式
DEBUG=false
```

### Cookie Storage

- Cookie 存储位置：`{baseDir}/cookies.json`
- 支持手动导入 Cookie 文件

---

## Usage

### Basic Command Format

```bash
npm run <command> [options]
```

**Available Commands:**

| Command | Description |
|---------|-------------|
| `npm run login` | 扫码/短信登录（有头模式） |
| `npm run login:headless` | 扫码登录（无头模式，JSON 输出） |
| `npm run search -- <keyword>` | 搜索笔记 |
| `npm run publish` | 发布笔记 |
| `npm run scrape -- <subcommand>` | 数据抓取 |
| `npm run start -- <command>` | 通用入口 |

> **Note:** 使用 `--` 分隔 npm 和脚本参数，如 `npm run search -- "美食" --limit 10`

---

## Commands

### Login

首次使用需要登录：

```bash
# 有头模式（默认）- 浏览器显示二维码
npm run login

# 无头模式 - 二维码输出为 JSON
npm run login:headless
# 或
HEADLESS=true npm run login
```

**支持的登录方式：**
- 扫码登录（默认）：显示二维码供用户扫描
- 短信验证登录：`npm run login -- --sms`

---

#### 无头模式登录流程

无头模式下，二维码以 JSON 格式输出到 stdout，供 OpenClaw 展示给用户：

**1. 执行登录命令：**

```bash
npm run login:headless
```

**2. 输出二维码 JSON：**

```json
{
  "type": "qr_login",
  "status": "waiting_scan",
  "qr": "data:image/png;base64,iVBORw0KGgoAAAANS...",
  "message": "请使用小红书 App 扫描二维码登录"
}
```

**3. OpenClaw 处理流程：**

```
1. 解析 JSON，识别 type === "qr_login"
2. 从 qr 字段获取 Data URL（可直接用于 <img src="...">）
3. 将二维码展示给用户
4. 等待用户扫码
5. 登录成功后输出：
   {
     "success": true,
     "data": { "success": true, "message": "Login successful. Cookies saved.", "cookieSaved": true }
   }
```

**4. 示例代码（OpenClaw 处理）：**

```javascript
// 解析输出
const output = JSON.parse(stdout);

if (output.type === 'qr_login') {
  // 展示二维码给用户
  await showQrCodeToUser(output.qr);
  // 等待用户扫码...
}

// 登录成功
if (output.success) {
  console.log('登录成功');
}
```

---

#### 有头模式登录流程

有头模式下，浏览器窗口自动打开并显示二维码：

```
1. 执行 npm run login
2. 浏览器打开登录页面，显示二维码
3. 用户用小红书 App 扫码
4. 登录成功，Cookie 自动保存
```

**注意：** 用户关闭浏览器窗口会被检测为登录取消。

---

#### 手动导入 Cookie

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

#### 登录配置

在 `.env` 文件中配置默认值：

```env
# 登录方式: qr 或 sms
LOGIN_METHOD=qr

# 登录超时（毫秒）
LOGIN_TIMEOUT=120000

# 无头模式
HEADLESS=true
```

**CLI 参数优先级高于 .env 配置。**

---

### Search Notes

```bash
npm run search -- "<keyword>" [--limit 20] [--sort hot|time]
```

**Parameters:**
- `keyword`: 搜索关键词（必需）
- `--limit`: 返回结果数量，默认 20
- `--sort`: 排序方式，`hot` 热门优先，`time` 时间优先

**Example:**

```bash
npm run search -- "美食探店" --limit 10 --sort hot
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
      "author": { "id": "user-id", "name": "作者名", "url": "/user/profile/..." },
      "stats": { "likes": 1000, "collects": 500, "comments": 100 },
      "cover": "https://sns-webpic-qc.xhscdn.com/...",
      "url": "https://www.xiaohongshu.com/explore/note-id?xsec_token=...",
      "xsecToken": "ABssN-ZxEtg2nmmN..."
    }
  ]
}
```

---

### Publish Note

```bash
npm run publish -- --title "标题" --content "正文" --images "img1.jpg,img2.jpg"
```

**Parameters:**
- `--title`: 笔记标题（必需）
- `--content`: 笔记正文
- `--images`: 图片路径，多个用逗号分隔
- `--video`: 视频路径（与 images 二选一）
- `--tags`: 标签，多个用逗号分隔

**Example:**

```bash
npm run publish -- --title "今日探店" --content "这家店超好吃！" --images "./photos/1.jpg,./photos/2.jpg" --tags "美食,探店"
```

---

### Interactions

#### Like Note

```bash
npm run start -- like "<note-url>"
```

#### Collect Note

```bash
npm run start -- collect "<note-url>"
```

#### Comment on Note

```bash
npm run start -- comment "<note-url>" "评论内容"
```

#### Follow User

```bash
npm run start -- follow "<user-url>"
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
npm run scrape -- note "<note-url>"
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
npm run scrape -- user "<user-url>"
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