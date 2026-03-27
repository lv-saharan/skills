# 小红书自动化 Skill (xhs-ts)

[![Version](https://img.shields.io/badge/version-0.0.6-blue.svg)](https://github.com/lv-saharan/skills/tree/main/xhs-ts)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.16.0-brightgreen.svg)](https://nodejs.org/)

小红书（Xiaohongshu）全功能自动化技能，支持搜索、发布、互动、数据抓取。基于 Playwright 构建，提供完整的反检测防护机制。

## 功能特性

| 功能 | 命令 | 状态 | 说明 |
|------|------|------|------|
| 🔐 登录 | `npm run login` | ✅ 已实现 | 扫码/短信登录，Cookie 管理 |
| 🔍 搜索 | `npm run search -- "<keyword>"` | ✅ 已实现 | 关键词搜索，多维度筛选 |
| 📝 发布 | `npm run publish -- [options]` | ✅ 已实现 | 图文/视频笔记发布 |
| 👤 多用户 | `npm run user` | ✅ 已实现 | 多账号管理 |
| 👍 点赞 | `npm run like -- "<url>" [urls...]` | ✅ 已实现 | 点赞笔记（支持批量） |
| 📌 收藏 | `npm run collect -- "<url>" [urls...]` | ✅ 已实现 | 收藏笔记（支持批量） |
| 💬 评论 | `npm run comment -- "<url>" "text"` | ✅ 已实现 | 评论笔记 |
| 👥 关注 | `npm run follow -- "<url>" [urls...]` | ✅ 已实现 | 关注用户（支持批量） |
| 📊 抓取笔记 | `npm run start -- scrape-note "<url>"` | ✅ 已实现 | 笔记详情数据 |
| 📊 抓取用户 | `npm run start -- scrape-user "<url>"` | ✅ 已实现 | 用户主页数据 |
| 🛡️ 风控 | 内置 | — | 随机延迟、轨迹随机化、频率限制 |

---

## 快速开始

### 前置要求

- Node.js >= 22.16.0
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

# 无头模式登录（二维码保存到文件）
npm run login:headless

# 短信验证登录
npm run login -- --sms

# 指定用户登录
npm run login -- --user "小号"
```

**登录参数：**

| 参数 | 说明 | 默认值 |
|------|------|--------|
| `--qr` | 二维码登录 | ✅ 默认方式 |
| `--sms` | 短信登录 | — |
| `--headless` | 无头模式运行 | `false` |
| `--timeout` | 登录超时时间（毫秒） | `120000` |
| `--user` | 指定用户 | 当前用户 |

### 多用户管理

xhs-ts 支持多账号管理，每个用户拥有独立的 Cookie 和临时文件。

**目录结构：**

```
xhs-ts/
├── users/                    # 多用户目录
│   ├── users.json            # 用户元数据
│   ├── default/              # 默认用户
│   │   ├── cookies.json
│   │   └── tmp/
│   └── 小号/                 # 用户"小号"
│       ├── cookies.json
│       └── tmp/
```

**用户选择优先级：**

```
--user <name>  >  users.json current  >  default
```

**命令示例：**

```bash
# 查看用户列表
npm run user

# 设置当前用户
npm run user:use -- "小号"

# 重置为默认用户
npm run user -- --set-default

# 登录指定用户
npm run login -- --user "小号"
```

### 搜索笔记

```bash
# 基本搜索
npm run search -- "美食探店"

# 指定数量和排序
npm run search -- "美食探店" --limit 20 --sort hot

# 筛选图文笔记，发布时间在一周内
npm run search -- "美食探店" --note-type image --time-range week

# 组合筛选
npm run search -- "旅游攻略" --limit 20 --sort hot --note-type video --time-range month --location city
```

**参数说明：**

| 参数 | 说明 | 可选值 | 默认值 |
|------|------|--------|--------|
| `<keyword>` | 搜索关键词（必填） | — | — |
| `--limit` | 返回结果数量 | 1-100 | `10` |
| `--skip` | 跳过结果数量 | 非负整数 | `0` |
| `--sort` | 排序方式 | `general`, `time_descending`, `hot` | `general` |
| `--note-type` | 笔记类型 | `all`, `image`, `video` | `all` |
| `--time-range` | 发布时间 | `all`, `day`, `week`, `month` | `all` |
| `--scope` | 搜索范围 | `all`, `following` | `all` |
| `--location` | 位置距离 | `all`, `nearby`, `city` | `all` |
| `--user` | 指定用户 | 用户名 | 当前用户 |

### 发布笔记

```bash
# 发布图文笔记
npm run publish -- --title "今日探店" --content "这家店超好吃！" --images "./photos/1.jpg,./photos/2.jpg"

# 发布视频笔记
npm run publish -- --title "我的Vlog" --content "周末日常" --video "./video.mp4"

# 带标签发布
npm run publish -- --title "今日探店" --content "好吃！" --images "./photos/1.jpg" --tags "美食,探店"
```

**参数说明：**

| 参数 | 必需 | 说明 |
|------|------|------|
| `--title` | 是 | 笔记标题（最多 20 字） |
| `--content` | 是 | 笔记正文（最多 1000 字） |
| `--images` | 二选一 | 图片路径，逗号分隔（1-9 张） |
| `--video` | 二选一 | 视频路径（最大 500MB） |
| `--tags` | 否 | 标签，逗号分隔（最多 10 个） |
| `--user` | 否 | 指定用户 |

---

## 互动操作

### 点赞笔记

```bash
# 点赞单个笔记
npm run like -- "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx"

# 批量点赞
npm run like -- "url1" "url2" "url3"

# 设置间隔（默认 2000ms）
npm run like -- "url1" "url2" --delay 3000
```

### 收藏笔记

```bash
# 收藏单个笔记
npm run collect -- "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx"

# 批量收藏
npm run collect -- "url1" "url2" --delay 3000
```

### 评论笔记

```bash
# 评论笔记
npm run comment -- "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx" "太棒了！"

# 指定用户
npm run comment -- "url" "评论内容" --user "小号"
```

> ⚠️ **注意**：账号需绑定手机号才能评论。未绑定返回错误：`评论受限: 绑定手机`

### 关注用户

```bash
# 关注单个用户
npm run follow -- "https://www.xiaohongshu.com/user/profile/userId"

# 批量关注
npm run follow -- "url1" "url2" --delay 3000
```

---

## 数据抓取

### 抓取笔记详情

```bash
# 基本抓取
npm run start -- scrape-note "https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx"

# 包含评论
npm run start -- scrape-note "url" --comments --max-comments 50
```

**输出字段**：`noteId`, `title`, `content`, `images`, `video`, `author`, `stats`, `tags`, `publishTime`, `location`

### 抓取用户主页

```bash
# 基本抓取
npm run start -- scrape-user "https://www.xiaohongshu.com/user/profile/userId"

# 包含最近笔记
npm run start -- scrape-user "url" --notes --max-notes 24
```

**输出字段**：`userId`, `name`, `avatar`, `bio`, `stats`, `tags`, `recentNotes`

---

## 输出格式

所有命令输出 JSON 到 stdout。`toAgent` 字段提供**可执行的指令**。

### toAgent 格式

```
ACTION[:TARGET][:HINT]
```

| Action | Agent 行为 |
|--------|-----------|
| `DISPLAY_IMAGE` | 使用 `look_at` 读取图片，根据 Channel 类型发送 |
| `RELAY` | 直接转发消息给用户 |
| `WAIT` | 等待用户操作，提示 HINT 文本 |
| `PARSE` | 格式化 `data` 内容并展示 |

---

## 项目结构

```
xhs-ts/
├── SKILL.md              # AgentSkills 技能定义
├── README.md             # 本文档
├── AGENTS.md             # 开发指南
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── references/           # 详细文档
│   ├── installation.md
│   ├── configuration.md
│   ├── commands.md
│   ├── channel-integration.md
│   └── troubleshooting.md
├── scripts/              # 源代码
│   ├── index.ts          # CLI 入口
│   ├── cli/types.ts      # CLI 类型定义
│   ├── config/           # 配置模块
│   ├── browser/          # 浏览器管理
│   ├── cookie/           # Cookie 管理
│   ├── user/             # 多用户管理
│   ├── login/            # 登录模块
│   ├── search/           # 搜索模块
│   ├── publish/          # 发布模块
│   ├── interact/         # 互动模块
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── selectors.ts
│   │   ├── shared.ts     # 共享工具
│   │   ├── url-utils.ts  # URL 提取
│   │   ├── like.ts
│   │   ├── collect.ts
│   │   ├── comment.ts
│   │   └── follow.ts
│   ├── scrape/           # 数据抓取模块
│   │   ├── index.ts
│   │   ├── types.ts
│   │   ├── selectors.ts
│   │   ├── utils.ts
│   │   ├── note.ts
│   │   └── user.ts
│   ├── shared/           # 共享模块
│   └── utils/            # 工具函数
├── users/                # 多用户目录
└── tests/                # 测试文件
```

---

## 错误处理

| Code | 说明 | 解决方案 |
|------|------|----------|
| `NOT_LOGGED_IN` | 未登录或 Cookie 过期 | 执行 `npm run login` |
| `RATE_LIMITED` | 触发频率限制 | 等待后重试 |
| `NOT_FOUND` | 资源不存在 | 检查 URL 格式 |
| `CAPTCHA_REQUIRED` | 需要验证码 | 手动处理 |
| `LOGIN_FAILED` | 登录失败 | 重试或手动导入 Cookie |
| `BROWSER_ERROR` | 浏览器错误 | 检查 Playwright 安装 |

---

## 注意事项

1. **URL 必须包含 xsec_token** — 通过搜索命令获取完整 URL
2. **评论需绑定手机号** — 未绑定账号无法评论
3. **频率控制** — 操作间保持 2-5 秒间隔
4. **账号安全** — 建议使用小号测试
5. **Node.js 版本** — 需要 >= 22.16.0

---

## 相关文档

- [安装指南](references/installation.md)
- [配置说明](references/configuration.md)
- [命令参考](references/commands.md)
- [Channel 集成](references/channel-integration.md)
- [故障排除](references/troubleshooting.md)

---

## License

MIT
