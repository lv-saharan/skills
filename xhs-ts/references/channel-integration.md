# Channel Integration Guide

Agent 应根据接入的 Channel 类型，选择合适的消息发送格式。
建议直接阅读对应插件的README.md或者SKILL.md
---

## 核心策略概览

| 场景 | 飞书 | 企业微信 | 微信个人号 | CLI |
|------|------|----------|-----------|-----|
| **本地图片（QR码）** | 上传 → `image_key` | Base64 编码 | AES 加密 → CDN 上传 | `look_at` 显示 |
| **网络图片 URL** | 下载 → 上传 | 图文消息 `picurl` ✅ | 下载 → CDN 上传 | 直接输出链接 |
| **搜索结果缩略图** | 下载 → 上传 | 图文消息 `picurl` ✅ | 文本/链接分享 | 输出为列表 |
| **结构化数据** | 卡片消息 | Markdown | 文本消息 | 表格输出 |

> **企业微信最优**：网络图片可直接用 `picurl`，无需下载上传

---

## 飞书 (Feishu / Lark)

### 消息类型

| 类型 | msg_type | 说明 |
|------|----------|------|
| 文本 | `text` | 简单文本、@提及 |
| 富文本 | `post` | 格式化文本，可内嵌图片/视频 |
| 图片 | `image` | 需先上传获取 `image_key` |
| 视频 | `media` | 需先上传获取 `file_key` |
| 音频 | `audio` | 需先上传获取 `file_key` |
| 文件 | `file` | 需先上传获取 `file_key` |
| 卡片 | `interactive` | 复杂数据、表格、按钮 |

### 图片发送

**关键限制：飞书不支持直接通过 URL 发送图片，必须先上传。**

```
本地图片 → 上传 API → image_key → 发送消息
网络图片 → 下载 → 上传 API → image_key → 发送消息
```

```json
{
  "msg_type": "image",
  "content": { "image_key": "img_v3_xxxxxxxx" }
}
```

**图片要求：** ≤ 10 MB，格式：JPG/PNG/WEBP/GIF/BMP/TIFF/HEIC

### 视频发送 (media)

```json
{
  "msg_type": "media",
  "content": {
    "file_key": "file_v2_xxx",
    "image_key": "img_v2_xxx"  // 可选，视频封面
  }
}
```

**处理流程：** 上传视频 → 获取 `file_key` → 发送

### 卡片消息（推荐用于搜索结果）

```json
{
  "msg_type": "interactive",
  "card": {
    "header": { "title": {"tag": "plain_text", "content": "搜索结果"} },
    "elements": [
      { "tag": "markdown", "content": "**找到 10 条笔记**\n\n1. 标题1 - 作者A" }
    ]
  }
}
```

---

## 企业微信 (WeChat Work / WeCom)

### 图片发送

**两种方式：**

| 方式 | 适用场景 | 限制 |
|------|----------|------|
| 图片消息 (base64) | QR 码、必须展示的图片 | ≤ 2MB，需编码 |
| 图文消息 (picurl) | 缩略图、可点击的图片 | 使用 URL，无需上传 |

#### 方式一：图片消息（Base64）

```json
{
  "msgtype": "image",
  "image": {
    "base64": "iVBORw0KGgo...",
    "md5": "abc123def456..."
  }
}
```

**处理流程：** 读取本地图片 → Base64 编码 + MD5 → 发送

#### 方式二：图文消息（推荐用于网络图片）

```json
{
  "msgtype": "news",
  "news": {
    "articles": [
      {
        "title": "搜索结果",
        "description": "找到 10 条笔记",
        "url": "https://www.xiaohongshu.com/...",
        "picurl": "https://sns-webpic-qc.xhscdn.com/..."
      }
    ]
  }
}
```

**优势：** 直接使用图片 URL，无需下载/上传。适合搜索结果缩略图。

---

## 微信个人号 (WeChat Personal)

> **腾讯官方插件** - `@tencent-weixin/openclaw-weixin`

### 安装

```bash
# 一键安装
npx -y @tencent-weixin/openclaw-weixin-cli install

# 扫码登录
openclaw channels login --channel openclaw-weixin

# 重启 gateway
openclaw gateway restart
```

### 支持的消息类型

| type | 类型 | 说明 |
|------|------|------|
| 1 | TEXT | 文本消息 |
| 2 | IMAGE | 图片（CDN 上传） |
| 3 | VOICE | 语音（SILK 编码） |
| 4 | FILE | 文件 |
| 5 | VIDEO | 视频（含缩略图） |

### 图片/视频发送流程

媒体文件通过 CDN 传输，需 AES-128-ECB 加密：

```
1. 计算文件大小、MD5、加密后密文大小
2. 调用 getUploadUrl → 获取 upload_param
3. AES-128-ECB 加密文件内容
4. PUT 上传到 CDN URL
5. sendMessage 发送 CDNMedia 引用
```

**发送图片示例：**

```json
{
  "msg": {
    "to_user_id": "<用户ID>",
    "context_token": "<上下文令牌>",
    "item_list": [
      {
        "type": 2,
        "image_item": {
          "encrypt_query_param": "<CDN参数>",
          "aes_key": "<AES密钥>"
        }
      }
    ]
  }
}
```

### 多账号上下文隔离

```bash
openclaw config set agents.mode per-channel-per-peer
```

每个「微信账号 + 发消息用户」组合独立 AI 记忆。

---

## CLI / Web 终端

| 内容类型 | 处理方式 |
|----------|----------|
| 文本消息 | 直接输出到 stdout |
| 本地图片 | 使用 `look_at` 读取并展示 |
| 网络图片 | 输出 URL 链接 |
| 结构化数据 | 格式化为表格或列表 |

---

## toAgent 处理策略

### DISPLAY_IMAGE 处理

```
本地文件 (qrPath 是文件路径)
  ├── 飞书：上传 → image_key → 发送图片消息
  ├── 企业微信：Base64 + MD5 → 发送图片消息
  ├── 微信个人号：AES 加密 → CDN 上传 → 发送 CDNMedia
  └── CLI：look_at 显示

网络图片 (cover 是 URL)
  ├── 飞书：下载 → 上传 → image_key → 发送
  ├── 企业微信：使用图文消息 picurl（无需下载）✅ 最优
  ├── 微信个人号：下载 → AES 加密 → CDN 上传 → 发送
  └── CLI：输出链接
```

### PARSE 处理

```
飞书卡片：markdown 组件 + button 组件
企业微信：Markdown 消息 或 图文消息（带缩略图）
微信个人号：文本消息 或 链接分享
CLI：表格格式输出
```

---

## 参考资料

- [飞书开放平台 - 自定义机器人](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)
- [飞书开放平台 - 上传图片](https://open.feishu.cn/document/uAjLw4CM/ukTMukTMukTM/reference/im-v1/image/create)
- [企业微信 - 消息推送](https://developer.work.weixin.qq.com/document/path/91770)
- [OpenClaw Feishu Plugin](https://github.com/m1heng/clawdbot-feishu)
- **微信官方插件**: `@tencent-weixin/openclaw-weixin`