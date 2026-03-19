# 小红书自动化 Skill (xhs-ts)

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/openclaw/xhs-ts)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

小红书（Xiaohongshu）全功能自动化技能，支持搜索、发布、互动、数据抓取。基于 Playwright 构建，提供完整的反检测防护机制。

## 功能特性

| 功能 | 命令 | 说明 |
|------|------|------|
| 🔐 登录 | `npm run login` | 扫码/短信登录，Cookie 管理 |
| 🔍 搜索 | `npm run search -- "<keyword>"` | 关键词搜索，热门/时间排序 |
| 📝 发布 | `npm run publish -- [options]` | 图文/视频笔记发布 |
| 💬 互动 | `npm run start -- like/collect/comment/follow` | 点赞、收藏、评论、关注 |
| 📊 抓取 | `npm run scrape -- note/user` | 笔记详情、用户主页数据 |
| 🛡️ 风控 | 内置 | 随机延迟、轨迹随机化、频率限制 |

---

## 快速开始

### 前置要求

- Node.js >= 18
- npm 或 pnpm
- 小红书账号（建议使用小号测试）

### 安装步骤

```bash
# 1. 安装依赖
npm install

# 2. 安装 Playwright 浏览器
npm run install:browser

# 国内用户可设置镜像
# Windows
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright && npm run install:browser

# macOS/Linux
PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright npm run install:browser

# 3. 验证安装
npm run start -- --help
```

### 配置环境变量

复制 `.env.example` 为 `.env`：

```bash
cp .env.example .env
```

编辑 `.env` 文件：

```env
# 代理设置（可选）
PROXY=http://127.0.0.1:7890

# 无头模式（默认 true）
HEADLESS=true

# 浏览器路径（可选）
BROWSER_PATH=
```

---

## 使用指南

### 登录

首次使用需要登录：

```bash
# 扫码登录（默认）
npm run login

# 短信验证登录
npm run login -- --sms
```

**手动导入 Cookie：**

1. 浏览器登录小红书
2. F12 → Application → Cookies → xiaohongshu.com
3. 复制关键 Cookie（a1, web_session 等）
4. 创建 `cookies.json`：

```json
{
  "cookies": [
    { "name": "a1", "value": "你的值", "domain": ".xiaohongshu.com", "path": "/" },
    { "name": "web_session", "value": "你的值", "domain": ".xiaohongshu.com", "path": "/" }
  ]
}
```

### 搜索笔记

```bash
# 基本搜索
npm run search -- "美食探店"

# 指定数量和排序
npm run search -- "美食探店" --limit 10 --sort hot
```

**参数说明：**
- `keyword`: 搜索关键词（必需）
- `--limit`: 返回数量，默认 20
- `--sort`: 排序方式，`hot` 热门，`time` 最新

**输出示例：**

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

### 发布笔记

```bash
npm run publish -- --title "今日探店" --content "这家店超好吃！" --images "./photos/1.jpg,./photos/2.jpg" --tags "美食,探店"
```

**参数说明：**
- `--title`: 笔记标题（必需）
- `--content`: 笔记正文
- `--images`: 图片路径，多个用逗号分隔
- `--video`: 视频路径（与 images 二选一）
- `--tags`: 标签，多个用逗号分隔

### 互动操作

```bash
# 点赞
npm run start -- like "https://www.xiaohongshu.com/explore/note-id"

# 收藏
npm run start -- collect "https://www.xiaohongshu.com/explore/note-id"

# 评论
npm run start -- comment "https://www.xiaohongshu.com/explore/note-id" "太棒了！"

# 关注
npm run start -- follow "https://www.xiaohongshu.com/user/user-id"
```

### 数据抓取

```bash
# 抓取笔记详情
npm run scrape -- note "https://www.xiaohongshu.com/explore/note-id"

# 抓取用户主页
npm run scrape -- user "https://www.xiaohongshu.com/user/user-id"
```

---

## 风控防护

内置以下反检测机制：

| 机制 | 说明 |
|------|------|
| 随机延迟 | 操作间 1-3 秒随机等待 |
| 鼠标轨迹随机化 | 非直线移动，模拟真实操作 |
| 请求频率限制 | 防止高频操作触发风控 |
| 验证码处理 | 自动识别并提示处理 |

**建议：**
- 每次操作间隔保持在 2-5 秒
- 避免短时间内大量操作
- 高频操作建议使用代理 IP

---

## 错误处理

所有错误以 JSON 格式返回：

```json
{
  "error": true,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

**常见错误码：**

| Code | 说明 | 解决方案 |
|------|------|----------|
| `NOT_LOGGED_IN` | 未登录或 Cookie 过期 | 执行 `xhs login` |
| `RATE_LIMITED` | 触发频率限制 | 等待后重试 |
| `NOT_FOUND` | 资源不存在 | 检查 URL |
| `NETWORK_ERROR` | 网络错误 | 检查网络/代理 |
| `CAPTCHA_REQUIRED` | 需要验证码 | 手动处理 |

---

## 项目结构

```
xhs-ts/
├── SKILL.md           # OpenClaw 技能定义
├── README.md          # 本文档
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

## 常见问题

### Playwright 浏览器安装失败

```bash
# Windows 设置镜像
set PLAYWRIGHT_DOWNLOAD_HOST=https://npmmirror.com/mirrors/playwright
npx playwright install chromium
```

### 登录失败

- 检查网络连接
- 确认小红书 App 已更新
- 尝试手动导入 Cookie

### 搜索结果为空

- 检查 Cookie 是否有效
- 确认关键词是否正确
- 检查网络连接

---

## 注意事项

⚠️ **重要提醒**

1. **频率控制** - 避免短时间内大量操作
2. **账号安全** - 建议使用小号测试
3. **合规使用** - 遵守小红书用户协议
4. **Cookie 有效期** - 定期检查登录状态
5. **代理使用** - 高频操作建议使用代理 IP

---

## License

MIT