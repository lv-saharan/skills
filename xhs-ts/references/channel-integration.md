# Channel Integration Guide

Agent 应根据接入的 Channel 类型，选择合适的消息发送格式。

---

## 核心策略

| 场景 | 飞书 | 企业微信 | 微信个人号 | CLI |
|------|------|----------|-----------|-----|
| **本地图片** | 上传 → `image_key` | Base64 + MD5 | AES 加密 → CDN | `look_at` |
| **网络图片** | 下载 → 上传 | `picurl` 直接用 ✅ | 下载 → CDN | 输出链接 |
| **结构化数据** | 富文本 `post` | Markdown | 文本 | 表格 |

> **企业微信最优**：`picurl` 可直接使用图片 URL，无需下载上传

---

## 飞书 (Feishu)

### 频率限制

- 100 次/分钟，5 次/秒
- 请求体 ≤ 20 KB
- 避免整点/半点发送（可能触发 11232 流控）

### 图片发送

**必须先上传获取 `image_key`**，不支持直接 URL 发送。

| 限制 | 要求 |
|------|------|
| 大小 | ≤ 10 MB |
| 格式 | JPG/PNG/WEBP/GIF/BMP/TIFF/HEIC |
| GIF 分辨率 | ≤ 2000×2000 |
| 其他分辨率 | ≤ 12000×12000 |

### 富文本消息格式（推荐）

**支持标签**：`text` | `a`（链接） | `at`（@提及） | `img`（图片）

**关键**：链接必须用 `a` 标签，避免 URL 中的 `_` 被 markdown 解析截断。

---

## 小红书搜索结果输出格式

### 飞书富文本消息

**推荐格式**：每条笔记作为独立消息发送，间隔 600ms+ 避免流控。

```json
{
  "msg_type": "post",
  "content": {
    "zh_cn": {
      "title": "小红书搜索结果",
      "content": [
        [
          { "tag": "text", "text": "1. 标题内容 | ❤️ 18 赞\n" },
          { "tag": "a", "text": "作者名", "href": "https://www.xiaohongshu.com/user/profile/xxx" },
          { "tag": "text", "text": "\n" },
          { "tag": "a", "text": "https://www.xiaohongshu.com/explore/xxx?xsec_token=xxx", "href": "https://www.xiaohongshu.com/explore/xxx?xsec_token=xxx" }
        ]
      ]
    }
  }
}
```

### 企业微信

**方式一：图文消息（带缩略图）**

```json
{
  "msgtype": "news",
  "news": {
    "articles": [{
      "title": "1. 标题内容",
      "description": "❤️ 18 赞 | 作者：xxx",
      "url": "https://www.xiaohongshu.com/explore/xxx?xsec_token=xxx",
      "picurl": "https://sns-webpic-qc.xhscdn.com/xxx"
    }]
  }
}
```

**方式二：Markdown 消息**

```json
{
  "msgtype": "markdown",
  "markdown": {
    "content": "**搜索结果**\n\n1. [标题](https://www.xiaohongshu.com/explore/xxx?xsec_token=xxx)\n   ❤️ 18 赞 | 作者：[xxx](https://www.xiaohongshu.com/user/profile/xxx)"
  }
}
```

### 微信个人号

发送纯文本消息，格式化为列表。

---

## 关键要点

| 要点 | 说明 |
|------|------|
| **xsec_token 必需** | 小红书链接必须包含 `xsec_token` 参数，否则打开提示"内容不存在" |
| **链接用 a 标签** | 飞书富文本中链接必须用 `a` 标签，防止 `_` 被解析为斜体 |
| **企业微信 picurl** | 可直接使用图片 URL，无需下载上传（最优） |
| **批量发送间隔** | 飞书 600ms+，企业微信 3s+（20条/分钟限制） |

---

## toAgent 处理策略

### DISPLAY_IMAGE

```
本地文件 → 飞书: 上传 | 企业微信: Base64 | 微信: CDN上传 | CLI: look_at
网络图片 → 飞书: 下载上传 | 企业微信: picurl ✅ | 微信: 下载上传 | CLI: 输出链接
```

### PARSE（搜索结果）

```
飞书: 富文本 post 消息
企业微信: 图文 news 或 Markdown
微信: 纯文本
CLI: 表格
```

---

## 参考资料

- [飞书 - 自定义机器人](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)
- [企业微信 - 消息推送](https://developer.work.weixin.qq.com/document/path/91770)
- 微信个人号插件：`@tencent-weixin/openclaw-weixin`