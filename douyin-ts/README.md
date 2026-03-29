# 抖音自动化 Skill (douyin-ts)

[![Version](https://img.shields.io/badge/version-0.0.1-blue.svg)](https://github.com/lv-saharan/skills/tree/main/douyin-ts)

抖音（Douyin）自动化操作技能，支持登录、搜索视频、搜索用户、点赞、收藏、关注。

## 功能特性

| 功能 | 命令 | 说明 |
|------|------|------|
| 🔐 登录 | `npm run login` | 扫码登录 |
| 🔍 搜索视频 | `npm run search-video -- "<keyword>"` | 支持排序、时间筛选 |
| 🔍 搜索用户 | `npm run search-user -- "<keyword>"` | 返回用户信息 |
| 👍 点赞 | `npm run like -- "<url>"` | 支持批量 |
| 📌 收藏 | `npm run collect -- "<url>"` | 支持批量 |
| ➕ 关注 | `npm run follow -- "<url>"` | 支持批量 |

---

## 快速开始

```bash
# 安装依赖
npm install

# 安装浏览器
npm run install:browser

# 登录
npm run login
```

---

## 搜索视频 (语义化参数)

### 排序方式 `--sort-type`

| 值 | 说明 |
|----|------|
| `comprehensive` | 综合排序 (默认) |
| `most-likes` | 最多点赞 |
| `latest` | 最新发布 |

### 发布时间 `--publish-time`

| 值 | 说明 |
|----|------|
| `unlimited` | 不限 (默认) |
| `one-day` | 一天内 |
| `one-week` | 一周内 |
| `six-months` | 半年内 |

### 返回字段

| 字段 | 说明 |
|------|------|
| `url` | 视频链接 |
| `videoId` | 视频ID |
| `title` | 视频标题 |
| `author` | 作者昵称 |
| `likes` | 点赞数 (如 "3.8万") |
| `duration` | 时长 (如 "01:09:35") |
| `timeAgo` | 发布时间 (如 "3周前") |
| `coverUrl` | 封面图片链接 |

### 示例

```bash
# 综合搜索
npm run search-video -- "美食"

# 最多点赞 + 一周内
npm run search-video -- "美食" --sort-type most-likes --publish-time one-week

# 最新发布
npm run search-video -- "美食" --sort-type latest --limit 20
```

---

## 搜索用户

### 返回字段

| 字段 | 说明 |
|------|------|
| `url` | 用户主页链接 |
| `userId` | 用户ID |
| `nickname` | 昵称 |
| `signature` | 个性签名 |
| `verified` | 是否认证 |
| `avatarUrl` | 头像链接 |

### 示例

```bash
# 基本搜索
npm run search-user -- "抖音" --limit 10
```

---

## 工作流示例

```bash
# 1. 搜索最新视频
npm run search-video -- "美食" --sort-type latest --limit 10

# 2. 点赞搜索结果
npm run like -- "url1" "url2"

# 3. 搜索用户
npm run search-user -- "抖音" --limit 5

# 4. 关注用户
npm run follow -- "user-url"
```

---

## 测试结果

```bash
# 搜索视频 ✅
npm run search-video -- "美丽毒素" --sort-type latest --limit 5
# 返回: 5条结果，包含标题、作者、点赞数、时长、发布时间

# 搜索用户 ✅  
npm run search-user -- "抖音" --limit 3
# 返回: 3条结果，包含昵称、签名、认证状态、头像
```

---

## License

MIT
