# Channel Integration Guide

Agent 应根据接入的 Channel 类型，选择合适的消息发送格式。

---

## Quick Decision Tree

收到 `toAgent: "PARSE:notes"` →

1. **判断 Channel 类型**
2. **飞书** → 交互卡片 + 反引号URL（逐条循环，唯一标准格式）
3. **企业微信** → 图文 news 或 Markdown
4. **微信个人号** → 文字 + 图片（逐条发送，每次一条等待返回）
5. **CLI** → 表格输出

```
N 条搜索结果 =
  飞书:     N × (交互卡片 + 反引号URL) = 2N 条消息
  企业微信: N 条 news 文章 或 N 段 Markdown
  微信:     N × (文字消息 + 图片消息) = 2N 条消息
  CLI:      单张表格
```

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

### 搜索结果数据结构

搜索命令返回的 `notes` 数组中每条笔记包含：

| 字段 | 类型 | 用途 |
|------|------|------|
| `id` | string | 笔记 ID |
| `title` | string | 笔记标题 |
| `author.id` | string | 作者 ID（用于关注按钮） |
| `author.name` | string | 作者名称 |
| `stats.likes` | number | 点赞数 |
| `stats.collects` | number | 收藏数 |
| `cover` | string | 封面图 URL |
| `url` | string | 笔记完整链接（含 xsec_token） |
| `xsecToken` | string | 安全令牌（互动操作必需） |

---

## 飞书卡片交互说明

> ⚠️ **重要**：飞书卡片交互功能需要**应用机器人**，自定义机器人不支持。

### 自定义机器人 vs 应用机器人

| 对比项 | 自定义机器人 | 应用机器人（推荐） |
|--------|-------------|-------------------|
| 创建方式 | 群设置中直接添加 | 开发者后台创建应用 |
| 卡片按钮 | 仅支持跳转 URL | 支持**交互回调** ✅ |
| 交互能力 | 无法接收按钮点击回调 | 通过长连接/Webhook接收回调 |
| 适用场景 | 单向通知 | 交互式操作（点赞、收藏、关注） |

> **开通指引**：[飞书开发者后台](https://open.feishu.cn/app) 创建应用 → 启用机器人 → 配置事件订阅（长连接）→ 添加 `im.message.receive_v1` 事件

---

### 飞书：交互式卡片 + 链接预览（唯一标准格式）

> **⚠️ 重要：这是飞书通道搜索结果的唯一发送格式。无论 1 条还是 N 条结果，不切换其他格式。**

**核心公式：**
```
N 条结果 = N × (交互卡片 + 反引号URL) = 2N 条消息
```

**发送策略：同一模板逐条循环，不切换格式。**

#### 单条结果的模板（每条结果都按此模板）

**第一条：交互式卡片（带三个按钮）**

> **注意**：
> - 以下 JSON 是 **飞书应用机器人消息格式**（`msg_type: "interactive"`）
> - **自定义机器人不支持交互回调**，按钮点击无法触发服务器响应
> - 如需交互功能，请参考上方「如何开通卡片交互」

```json
{
  "msg_type": "interactive",
  "card": {
    "config": {"wide_screen_mode": true},
    "elements": [
      {"tag": "div", "text": {"content": "**标题内容**\n\n👤 作者：作者名\n❤️ 点赞数：18 赞", "tag": "lark_md"}},
      {"tag": "action", "actions": [
        {"tag": "button", "text": {"tag": "plain_text", "content": "❤️ 点赞"}, "type": "primary", "value": {"action": "xhs_like", "note_id": "xxx", "xsec_token": "xxx"}},
        {"tag": "button", "text": {"tag": "plain_text", "content": "⭐ 收藏"}, "type": "default", "value": {"action": "xhs_collect", "note_id": "xxx", "xsec_token": "xxx"}},
        {"tag": "button", "text": {"tag": "plain_text", "content": "👤 关注"}, "type": "default", "value": {"action": "xhs_follow", "author_id": "xxx"}}
      ]}
    ]
  }
}
```

**第二条：纯链接（触发预览）**

```
`https://www.xiaohongshu.com/explore/xxx?xsec_token=xxx&xsec_source=pc_search`
```

> ⚠️ **必须用反引号包裹 URL**，否则飞书会把 `_` 解析为斜体，导致预览失效

#### 多条结果：逐条循环同一模板

```
第 1 条: [交互卡片1] → 600ms → [`URL1`] → 600ms
第 2 条: [交互卡片2] → 600ms → [`URL2`] → 600ms
第 3 条: [交互卡片3] → 600ms → [`URL3`] → 600ms
...
第 N 条: [交互卡片N] → 600ms → [`URLN`]
```

**关键规则：**
- 每条结果的卡片按钮 `value` 必须绑定**当前条**的 `note_id` + `xsec_token` + `author_id`
- 卡片之间间隔 **600ms+** 避免飞书流控（5次/秒限制）
- **不要**换成富文本 `post` 格式，保持统一的交互卡片格式

#### Agent 处理伪代码

```
收到 toAgent: "PARSE:notes" →
  for each note in data.notes:
    1. 构建交互卡片:
       - div.text = "**{note.title}**\n\n👤 作者：{note.author.name}\n❤️ 点赞数：{note.stats.likes} 赞"
       - 按钮1 value = { action: "xhs_like", note_id: note.id, xsec_token: note.xsecToken }
       - 按钮2 value = { action: "xhs_collect", note_id: note.id, xsec_token: note.xsecToken }
       - 按钮3 value = { action: "xhs_follow", author_id: note.author.id }
    2. 发送交互卡片消息
    3. 等待 600ms
    4. 发送反引号包裹的 URL: `{note.url}`
    5. 等待 600ms（最后一条可省略此步）
```

#### 发送顺序

1. 先发卡片 → 显示标题、作者、点赞数、三个按钮
2. 再发链接 → 飞书自动生成链接预览（封面图 + 简介）
3. 间隔 **600ms+** 避免飞书流控

#### 按钮动作说明

| 按钮 | action | 参数 |
|------|--------|------|
| ❤️ 点赞 | `xhs_like` | note_id, xsec_token |
| ⭐ 收藏 | `xhs_collect` | note_id, xsec_token |
| 👤 关注 | `xhs_follow` | author_id |

#### 卡片按钮回调

按钮 `value` 需包含：
- `action`: 回调标识（`xhs_like`, `xhs_collect`, `xhs_follow`）
- `note_id`: 笔记 ID（点赞、收藏）
- `xsec_token`: 安全令牌（点赞、收藏）
- `author_id`: 作者 ID（关注）

---

### 飞书：富文本消息（非搜索结果场景）

> **⚠️ 搜索结果不使用此格式。** 富文本 `post` 仅用于无交互需求的普通通知场景。

简单格式，无交互按钮。

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

> **关键**：链接必须用 `a` 标签，防止 `_` 被解析为斜体

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

> ⚠️ **重要：每条结果分两条消息，文字在前**

**顺序**：文字1 → 图片1 → 文字2 → 图片2 → 文字3 → 图片3

**关键**：每次只发一条，等待返回后再发下一条，保证顺序

#### 搜索结果字段

| 字段 | 用途 | 示例 |
|------|------|------|
| `cover` | 封面图 URL（发送图片消息） | `https://sns-webpic-qc.xhscdn.com/xxx!nc_n_webp_mw_1` |
| `url` | 笔记链接（发送文字消息） | `https://www.xiaohongshu.com/explore/noteId?xsec_token=xxx` |
| `xsecToken` | 安全令牌（用于互动操作） | `xxx%3D` |

#### 发送流程

**步骤1**：发送文字
```json
{
  "action": "send",
  "message": "标题 (点赞数)\nhttps://www.xiaohongshu.com/explore/笔记ID?xsec_token=xxx%3D&xsec_source=pc_search"
}
```
等待返回...

**步骤2**：发送封面图
```json
{
  "action": "send",
  "media": "https://sns-webpic-qc.xhscdn.com/xxx!nc_n_webp_mw_1"
}
```
等待返回...

**步骤3**：发送下一条结果的文字...
**步骤4**：发送下一条结果的图片...

#### 错误做法

❌ 多条消息同时发送（顺序可能乱）
❌ 图片在前，文字在后（顺序错误）
❌ 直接回复文字（`_` 变斜体，链接失效）

#### 正确做法

✅ 文字在前，图片在后
✅ 每次只发一条，等待返回
✅ 用 message 工具发送（绕过 Markdown）
✅ URL 保持原样（包含 `_` 和 `%3D`）

---

## 关键要点

| 要点 | 说明 |
|------|------|
| **xsec_token 必需** | 小红书链接必须包含 `xsec_token` 参数，否则打开提示"内容不存在" |
| **链接用 a 标签** | 飞书富文本中链接必须用 `a` 标签，防止 `_` 被解析为斜体 |
| **URL 反引号包裹** | 飞书纯链接消息必须用反引号包裹，否则预览失效 |
| **搜索结果格式** | 飞书通道统一使用交互卡片+链接，逐条循环，不切换格式 |
| **两条消息间隔** | 飞书交互卡片 + 链接之间间隔 600ms+ 避免流控 |
| **微信顺序** | 文字在前，图片在后；每次只发一条，等待返回后再发下一条 |
| **微信发送方式** | 用 message 工具发送文字（绕过 Markdown 解析），media 工具发送图片 |
| **企业微信 picurl** | 可直接使用图片 URL，无需下载上传（最优） |
| **批量发送间隔** | 飞书 600ms+，企业微信 3s+（20条/分钟限制），微信 逐条等待 |

---

## toAgent 处理策略

### DISPLAY_IMAGE

```
本地文件 → 飞书: 上传 | 企业微信: Base64 | 微信个人号: CDN上传 | CLI: look_at
网络图片 → 飞书: 下载上传 | 企业微信: picurl ✅ | 微信个人号: 下载上传 | CLI: 输出链接
```

### PARSE（搜索结果）

```
飞书: 交互卡片 + 链接预览（唯一标准格式，逐条循环）
     N 条结果 = N × (交互卡片 + 反引号URL) = 2N 条消息
     不要切换富文本 post，保持统一模板
企业微信: 图文 news 或 Markdown
微信个人号: 文字 + 图片（两条消息，逐条发送）
CLI: 表格
```

### XHS_LIKE/XHS_COLLECT/XHS_FOLLOW（回调处理）

飞书交互卡片按钮触发时，`value` 包含：

**点赞回调**：
```json
{
  "action": "xhs_like",
  "note_id": "xxx",
  "xsec_token": "xxx"
}
```

**收藏回调**：
```json
{
  "action": "xhs_collect",
  "note_id": "xxx",
  "xsec_token": "xxx"
}
```

**关注回调**：
```json
{
  "action": "xhs_follow",
  "author_id": "xxx"
}
```

Agent 应调用相应的 `xhs-ts` 命令执行操作：
- `npm run like -- "<url>"` — 点赞
- `npm run collect -- "<url>"` — 收藏
- `npm run follow -- "<url>"` — 关注

---

## 参考资料

- [飞书 - 自定义机器人](https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot)
- [企业微信 - 消息推送](https://developer.work.weixin.qq.com/document/path/91770)
- 微信个人号插件：`@tencent-weixin/openclaw-weixin`