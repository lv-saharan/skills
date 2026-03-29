---
name: douyin-ts
description: |
  Automate Douyin (抖音/TikTok中文版) — login, search videos, search users, like videos, collect videos, follow users.
  Supports semantic filter parameters and multi-account management.
license: MIT
compatibility: opencode
metadata:
  version: "0.0.1"
  last_updated: "2026-03-29"
---

# Douyin Automation Skill (douyin-ts)

## Quick Reference

| Task | Command |
|------|---------|
| Login | `npm run login` |
| Search Video | `npm run search-video -- "<keyword>" [--sort-type <type>] [--publish-time <time>]` |
| Search User | `npm run search-user -- "<keyword>"` |
| Like | `npm run like -- "<url>" [urls...]` |
| Collect | `npm run collect -- "<url>" [urls...]` |
| Follow | `npm run follow -- "<url>" [urls...]` |

---

## Search Video (语义化筛选参数)

```bash
# 基本搜索
npm run search-video -- "美食"

# 排序方式
npm run search-video -- "美食" --sort-type comprehensive  # 综合排序 (默认)
npm run search-video -- "美食" --sort-type most-likes     # 最多点赞
npm run search-video -- "美食" --sort-type latest         # 最新发布

# 发布时间
npm run search-video -- "美食" --publish-time unlimited    # 不限 (默认)
npm run search-video -- "美食" --publish-time one-day      # 一天内
npm run search-video -- "美食" --publish-time one-week     # 一周内
npm run search-video -- "美食" --publish-time six-months   # 半年内
```

### 返回结果

```json
{
  "type": "video",
  "url": "https://www.douyin.com/video/7613752674613316916",
  "videoId": "7613752674613316916",
  "title": "一口气看完最新美剧《美丽毒素》",
  "author": "秀才探影",
  "likes": "3.8万",
  "duration": "01:09:35",
  "timeAgo": "3周前",
  "coverUrl": "https://...",
  "hasCollection": true
}
```

---

## Search User

```bash
# 基本搜索
npm run search-user -- "抖音" --limit 5
```

### 返回结果

```json
{
  "type": "user",
  "url": "https://www.douyin.com/user/MS4wLjABAAAA...",
  "userId": "MS4wLjABAAAA...",
  "nickname": "抖音",
  "signature": "抖音，记录美好生活。",
  "verified": true,
  "avatarUrl": "https://..."
}
```

---

## 选择器策略

### 稳定性优先级

1. **URL 模式** (最稳定) - `a[href*="/video/"]`
2. **文本内容** - 正则匹配时间/数字格式
3. **语义化类名** - `.search-result-card`
4. **结构关系** - 父子元素定位

### 避免使用

- 随机哈希类名（如 `.VDYK8Xd7`）
- 这些类名在每次部署时可能变化

---

## 测试验证

### 搜索视频 ✅

```bash
# 综合排序
npm run search-video -- "美丽毒素" --limit 3
# 返回: 3条结果，点赞数正确 (3.8万, 2.7万, 1706)

# 最新发布
npm run search-video -- "抖音" --sort-type latest --limit 3
# 返回: 3条结果，时间正确 (5小时前, 5小时前, 6小时前)

# 最多点赞
npm run search-video -- "美食" --sort-type most-likes --limit 3
# 返回: 3条结果，点赞数正确 (16.3万, 6.7万, 6.0万)
```

### 搜索用户 ✅

```bash
npm run search-user -- "美食" --limit 3
# 返回: 3条结果，包含昵称、签名、认证状态
```

---

## Follow / Like / Collect

```bash
# 关注用户
npm run follow -- "https://www.douyin.com/user/xxx"

# 点赞视频
npm run like -- "https://www.douyin.com/video/xxx"

# 收藏视频
npm run collect -- "https://www.douyin.com/video/xxx"
```

---

## Multi-User

```bash
npm run user                          # 列出用户
npm run user:use -- "小号"            # 设置当前用户
npm run search-video -- "美食" --user "小号"
```

---

## License

MIT
