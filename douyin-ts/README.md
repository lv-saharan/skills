# 抖音自动化 Skill (douyin-ts)

[![Version](https://img.shields.io/badge/version-0.1.0-blue.svg)](https://github.com/lv-saharan/skills/tree/main/douyin-ts)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D22.16.0-brightgreen.svg)](https://nodejs.org/)

抖音（Douyin）全功能自动化技能，支持搜索、发布、互动、数据抓取。基于 Playwright 构建，提供完整的反检测防护机制。

## 功能特性

| 功能 | 命令 | 状态 | 说明 |
|------|------|------|------|
| 🔐 登录 | `npm run login` | ✅ 已实现 | 扫码/短信登录，Cookie 管理 |
| 🔍 搜索 | `npm run search -- "<keyword>"` | 🚧 Stub | 关键词搜索 |
| 📝 发布 | `npm run publish -- [options]` | 🚧 Stub | 视频/图文发布 |
| 👤 多用户 | `npm run user` | ✅ 已实现 | 多账号管理，独立 Profile |
| 👍 点赞 | `npm run like -- "<url>" [urls...]` | 🚧 Stub | 点赞视频（支持批量） |
| 📌 收藏 | `npm run collect -- "<url>" [urls...]` | 🚧 Stub | 收藏视频（支持批量） |
| 💬 评论 | `npm run comment -- "<url>" "text"` | 🚧 Stub | 评论视频 |
| 👥 关注 | `npm run follow -- "<url>" [urls...]` | 🚧 Stub | 关注用户（支持批量） |
| 📊 抓取视频 | `npm run scrape-note -- "<url>"` | 🚧 Stub | 视频详情数据 |
| 📊 抓取用户 | `npm run scrape-user -- "<url>"` | 🚧 Stub | 用户主页数据 |
| 🌐 浏览器管理 | `npm run browser -- --start` | ✅ 已实现 | CDP 浏览器实例管理 |
| 🛡️ 反检测 | 内置 | — | 模块化 stealth 脚本、人类行为模拟 |

---

## 快速开始

### 前置要求

- Node.js >= 22.16.0
- npm 或 pnpm
- 抖音账号（建议使用小号测试）

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

# 调试模式
DEBUG=false
```

---

## 使用指南

### 登录

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

### 多用户管理

```bash
# 查看用户列表
npm run user

# 设置当前用户
npm run user:use -- "小号"

# 重置为默认用户
npm run user -- --set-default
```

### 浏览器管理

```bash
# 启动浏览器实例
npm run browser -- --start
npm run browser -- --start --user "小号"
npm run browser -- --start --headless

# 查看实例状态
npm run browser -- --status

# 关闭实例
npm run browser -- --stop-user "小号"
npm run browser -- --stop
```

---

## 反检测机制

douyin-ts 内置多层反检测防护：

| 技术 | 说明 |
|------|------|
| **模块化 Stealth 脚本** | 13 个独立模块：navigator、screen、webgl、canvas、audio、chrome、webrtc 等 |
| **设备指纹伪装** | UserAgent、Viewport、WebGL、Canvas 噪声 |
| **人类行为模拟** | 贝塞尔曲线鼠标轨迹、物理滚动、随机延迟 |
| **时区/语言一致性** | 确保指纹参数与行为匹配 |
| **WebRTC 防护** | 阻止真实 IP 泄露 |

---

## 项目结构

```
douyin-ts/
├── SKILL.md              # AgentSkills 技能定义
├── README.md             # 本文档
├── AGENTS.md             # 开发指南
├── package.json          # 依赖配置
├── tsconfig.json         # TypeScript 配置
├── docs/                 # 开发文档
│   └── architecture/     # 架构详细说明
├── references/           # 用户文档
├── scripts/              # 源代码（分层架构）
│   ├── index.ts          # CLI 入口
│   ├── cli/              # CLI 命令入口
│   ├── actions/          # 业务操作模块
│   │   ├── shared/       # Session 管理
│   │   ├── login/        # 登录
│   │   ├── search/       # 搜索
│   │   ├── publish/      # 发布
│   │   ├── interact/     # 互动
│   │   └── scrape/       # 抓取
│   ├── core/             # 核心基础设施
│   ├── config/           # 配置
│   └── user/             # 多用户管理
└── users/                # 多用户目录
```

---

## 注意事项

1. **频率控制** — 操作间保持 2-5 秒间隔
2. **账号安全** — 建议使用小号测试
3. **Node.js 版本** — 需要 >= 22.16.0

---

## License

MIT
