# 小红书自动化 Skill (xhs-ts)

[![Version](https://img.shields.io/badge/version-0.0.2-blue.svg)](https://github.com/openclaw/xhs-ts)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)

小红书（Xiaohongshu）全功能自动化技能，支持搜索、发布、互动、数据抓取。基于 Playwright 构建，提供完整的反检测防护机制。

## 功能特性

| 功能 | 命令 | 状态 | 说明 |
|------|------|------|------|
| 🔐 登录 | `npm run login` | ✅ 已实现 | 扫码/短信登录，Cookie 管理 |
| 🔍 搜索 | `npm run search -- "<keyword>"` | ✅ 已实现 | 关键词搜索，多维度筛选 |
| 📝 发布 | `npm run publish -- [options]` | ✅ 已实现 | 图文/视频笔记发布 |
| 💬 点赞 | `npm run like -- "<url>"` | ❌ 未实现 | 点赞笔记 |
| 📌 收藏 | `npm run collect -- "<url>"` | ❌ 未实现 | 收藏笔记 |
| 💭 评论 | `npm run comment -- "<url>" "text"` | ❌ 未实现 | 评论笔记 |
| 👥 关注 | `npm run follow -- "<url>"` | ❌ 未实现 | 关注用户 |
| 📊 抓取 | `npm run start -- scrape-note/user` | ❌ 未实现 | 笔记详情、用户主页数据 |
| 🛡️ 风控 | 内置 | — | 随机延迟、轨迹随机化、频率限制 |

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

# 无头模式（留空自动检测：服务器强制 true，桌面端默认 false）
HEADLESS=

# 浏览器路径（可选，默认使用 Playwright 内置）
BROWSER_PATH=

# 登录配置
LOGIN_METHOD=qr        # 登录方式：qr 或 sms
LOGIN_TIMEOUT=120000   # 登录超时（毫秒）

# 调试模式
DEBUG=false
```

**无头模式自动检测规则：**

| 环境 | HEADLESS 值 |
|------|-------------|
| Linux 服务器（无 DISPLAY） | **强制 true** |
| Windows/macOS/Linux 桌面 | 使用 .env 设置（默认 false） |

---

## 使用指南

### 登录

首次使用需要登录：

```bash
# 扫码登录（默认）
npm run login

# 短信验证登录
npm run login -- --sms

# 登录创作服务平台（发布笔记需要）
npm run login -- --creator

# 同时登录主站和创作平台
npm run login && npm run login -- --creator
```

> **重要提示**：发布笔记功能需要登录创作服务平台 (`--creator`)。主站登录和创作平台登录是独立的，需要分别进行。

**登录参数：**

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--qr` | 二维码登录 | ✅ 默认方式 |
| `--sms` | 短信登录 | — |
| `--headless` | 无头模式运行 | `false` |
| `--timeout` | 登录超时时间（毫秒） | `120000` |
| `--creator` | 登录创作者中心 | — |

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
| `--sort` | 排序方式 | `general`（综合）、`time_descending`（最新）、`hot`（最热） | `general` |
| `--note-type` | 笔记类型 | `all`（全部）、`image`（图文）、`video`（视频） | `all` |
| `--time-range` | 发布时间 | `all`（不限）、`day`（一天内）、`week`（一周内）、`month`（一月内） | `all` |
| `--scope` | 搜索范围 | `all`（全部）、`following`（我关注的） | `all` |
| `--location` | 位置距离 | `all`（不限）、`nearby`（附近）、`city`（同城） | `all` |
| `--headless` | 无头模式运行 | — | `false` |

**注意事项：**
- `--scope following` 需要先登录
- 所有筛选参数可自由组合

**输出示例：**

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
    ],
    "filters": {
      "sort": "hot",
      "noteType": "image",
      "timeRange": "week"
    }
  }
}
```

### 发布笔记

发布图文或视频笔记到小红书。

```bash
# 发布图文笔记
npm run publish -- --title "今日探店" --content "这家店超好吃！" --images "./photos/1.jpg,./photos/2.jpg"

# 发布视频笔记
npm run publish -- --title "我的Vlog" --content "周末日常" --video "./video.mp4"

# 带标签发布
npm run publish -- --title "今日探店" --content "这家店超好吃！" --images "./photos/1.jpg" --tags "美食,探店"
```

**参数说明：**

| 参数 | 必需 | 说明 |
|------|------|------|
| `--title` | 是 | 笔记标题（最多 20 字） |
| `--content` | 是 | 笔记正文（最多 1000 字） |
| `--images` | 二选一 | 图片路径，多个用逗号分隔（1-9 张） |
| `--video` | 二选一 | 视频路径（单个文件，最大 500MB） |
| `--tags` | 否 | 标签，多个用逗号分隔（最多 10 个） |

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

## 输出格式

所有命令输出 JSON 到 stdout。`toAgent` 字段提供**可执行的指令**。

### toAgent 格式

```
ACTION[:TARGET][:HINT]
```

| Action | 含义 | 示例 |
|--------|------|------|
| `DISPLAY_IMAGE` | 显示图片给用户 | `DISPLAY_IMAGE:qrPath` |
| `RELAY` | 转发消息给用户 | `RELAY:发布成功` |
| `WAIT` | 等待用户操作 | `WAIT:扫码` |
| `PARSE` | 解析并展示数据 | `PARSE:notes` |

### 成功响应

```json
{
  "success": true,
  "data": { ... },
  "toAgent": "RELAY:操作成功"
}
```

### 错误响应

```json
{
  "error": true,
  "message": "错误描述",
  "code": "ERROR_CODE"
}
```

### 二维码（无头模式登录）

```json
{
  "type": "qr_login",
  "status": "waiting_scan",
  "qrPath": "/absolute/path/to/tmp/qr_login_20260322_093000.png",
  "message": "请使用小红书 App 扫描二维码登录",
  "toAgent": "DISPLAY_IMAGE:qrPath:WAIT:扫码"
}
```

**Agent 处理流程：**
1. 解析 `toAgent`：`DISPLAY_IMAGE:qrPath:WAIT:扫码`
2. 使用 `look_at` 工具读取 `qrPath` 图片
3. 展示给用户
4. 等待扫码

---

## 互动操作（未实现）

以下命令目前返回 `NOT_FOUND` 错误：

```bash
# 点赞
npm run like -- "https://www.xiaohongshu.com/explore/note-id"

# 收藏
npm run collect -- "https://www.xiaohongshu.com/explore/note-id"

# 评论
npm run comment -- "https://www.xiaohongshu.com/explore/note-id" "太棒了！"

# 关注
npm run follow -- "https://www.xiaohongshu.com/user/user-id"
```

---

## 数据抓取（未实现）

以下命令目前返回 `NOT_FOUND` 错误：

```bash
# 抓取笔记详情
npm run start -- scrape-note "https://www.xiaohongshu.com/explore/note-id"

# 抓取用户主页
npm run start -- scrape-user "https://www.xiaohongshu.com/user/user-id"
```

---

## 风控防护

内置以下反检测机制：

| 机制 | 说明 |
|------|------|
| 随机延迟 | 操作间 1-3 秒随机等待 |
| 鼠标轨迹随机化 | 非直线移动，模拟真实操作 |
| 请求频率限制 | 防止高频操作触发风控 |
| 验证码检测 | 自动识别并提示处理 |
| Stealth 脚本 | 浏览器指纹伪装 |

**建议：**
- 每次操作间隔保持在 2-5 秒
- 避免短时间内大量操作
- 高频操作建议使用代理 IP
- 使用小号测试

---

## 错误处理

**常见错误码：**

| Code | 说明 | 解决方案 |
|------|------|----------|
| `NOT_LOGGED_IN` | 未登录或 Cookie 过期 | 执行 `npm run login` |
| `RATE_LIMITED` | 触发频率限制 | 等待后重试，保持 2-5 秒间隔 |
| `NOT_FOUND` | 资源不存在或命令未实现 | 检查 URL 或命令 |
| `NETWORK_ERROR` | 网络错误 | 检查网络/代理 |
| `CAPTCHA_REQUIRED` | 需要验证码 | 手动处理或使用代理 |
| `COOKIE_EXPIRED` | Cookie 过期 | 重新登录 |
| `LOGIN_FAILED` | 登录失败 | 重试或手动导入 Cookie |
| `BROWSER_ERROR` | 浏览器错误 | 检查 Playwright 安装 |

---

## 项目结构

```
xhs-ts/
├── SKILL.md              # OpenClaw 技能定义
├── README.md             # 本文档
├── AGENTS.md             # 开发指南（给 AI Agent 使用）
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── .env.example          # 环境变量示例
├── references/           # 详细文档
│   ├── installation.md   # 安装指南
│   ├── configuration.md  # 配置说明
│   ├── commands.md       # 命令参考
│   └── troubleshooting.md # 故障排除
├── scripts/              # 源代码（模块化架构）
│   ├── index.ts          # CLI 入口
│   ├── cli/              # CLI 类型定义
│   ├── config/           # 配置模块
│   ├── browser/          # 浏览器管理（启动、上下文、Stealth）
│   ├── cookie/           # Cookie 管理（存储、验证）
│   ├── login/            # 登录模块（QR、SMS、验证）
│   ├── search/           # 搜索模块（URL构建、结果提取）
│   ├── publish/          # 发布模块（上传、编辑、提交）
│   ├── interact/         # 互动模块（点赞、收藏、评论、关注）
│   ├── scrape/           # 数据抓取模块
│   ├── shared/           # 共享类型、常量、错误
│   └── utils/            # 工具函数
│       ├── helpers/      # delay, randomDelay, waitForCondition
│       ├── anti-detect/  # humanClick, checkLoginStatus
│       └── output/       # outputSuccess, outputError
├── cookies.json          # Cookie 存储（运行时生成，git-ignored）
└── tmp/                  # 临时文件（QR 图片等，运行时生成）
```

---

## 重要提示

### Gotchas

1. **发布需要创作者登录** — 必须单独运行 `npm run login -- --creator`
2. **无头模式自动检测** — Linux 服务器（无 DISPLAY）自动强制无头模式
3. **二维码文件路径** — 无头模式下，二维码保存到 `{baseDir}/tmp/qr_login_*.png`
4. **频率限制** — 操作间保持 2-5 秒间隔以避免触发风控
5. **`--scope following`** — 需要先登录才能搜索关注用户的笔记
6. **筛选器应用** — 部分筛选通过 URL 参数应用，部分可能需要页面交互

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

### 无头模式二维码找不到

- 检查 `tmp/` 目录是否存在
- 查看输出 JSON 中的 `qrPath`

### TypeScript 错误

```bash
rm -rf node_modules
npm install
```

---

## 注意事项

⚠️ **重要提醒**

1. **频率控制** - 避免短时间内大量操作
2. **账号安全** - 建议使用小号测试
3. **合规使用** - 遵守小红书用户协议
4. **Cookie 有效期** - 定期检查登录状态
5. **代理使用** - 高频操作建议使用代理 IP
6. **纯 TypeScript** - 无编译步骤，tsx 直接执行

---

## 相关文档

- [安装指南](references/installation.md) - 详细安装步骤
- [配置说明](references/configuration.md) - 环境变量和文件位置
- [命令参考](references/commands.md) - 完整命令文档
- [故障排除](references/troubleshooting.md) - 常见问题解决方案

---

## License

MIT