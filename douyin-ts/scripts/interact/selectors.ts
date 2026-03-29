/**
 * Interact module selectors
 * 
 * SELECTOR STRATEGY: 使用结构化选择器，避免依赖随机哈希类名
 * 
 * 稳定性优先级：
 * 1. data-e2e 属性（语义化，相对稳定）
 * 2. href/src 属性模式（URL 路径，稳定）
 * 3. 文本内容匹配（:has-text, 相对稳定）
 * 4. 语义化类名（如 .search-result-card，相对稳定）
 * 5. DOM 结构关系（父子、兄弟关系）
 * 
 * 避免：
 * - 随机哈希类名（如 .VDYK8Xd7, .MZNczJmS）
 * - 这些类名在每次部署时可能变化
 */

// ============================================
// Note Page Selectors (未实现)
// ============================================

export const NOTE_SELECTORS = {
  container: '',
  content: '',
  interactContainer: '',
  engagementBar: '',
  leftArea: '',
} as const;

// ============================================
// Like Button Selectors
// ============================================

export const LIKE_SELECTORS = {
  button: [
    // 优先级1: data-e2e 属性
    '[data-e2e="like-icon"]',
    '[data-e2e="digg-icon"]',
    // 优先级2: 文本匹配
    'button:has-text("赞")',
    // 优先级3: 语义化类名片段
    '[class*="like-icon"]',
    '[class*="digg"]',
  ].join(','),
  icon: 'svg',
  activeState: [
    '[class*="liked"]',
    '[class*="active"]',
    'svg[class*="active"]',
  ].join(','),
  count: [
    '[data-e2e="like-count"]',
    '[data-e2e="digg-count"]',
  ].join(','),
  container: [
    '[class*="interact"]',
    '[class*="engagement"]',
  ].join(','),
} as const;

// ============================================
// Collect Button Selectors
// ============================================

export const COLLECT_SELECTORS = {
  button: [
    '[data-e2e="collect-icon"]',
    'button:has-text("收藏")',
    '[class*="collect"]',
    '[class*="favorite"]',
  ].join(','),
  icon: 'svg',
  activeState: '[class*="collect"][class*="active"]',
  count: '[class*="collect-count"]',
} as const;

// ============================================
// Comment Selectors (未实现)
// ============================================

export const COMMENT_SELECTORS = {
  button: '',
  input: '',
  submit: '',
  list: '',
} as const;

// ============================================
// Follow Button Selectors
// ============================================

export const FOLLOW_SELECTORS = {
  button: [
    '[data-e2e="follow-button"]',
    'button:has-text("关注")',
    'button:has-text("+关注")',
  ].join(','),
  followingState: [
    'button:has-text("已关注")',
    'button:has-text("互相关注")',
    'button:has-text("Following")',
  ].join(','),
  userInfoContainer: [
    '[data-e2e="user-info"]',
    '[class*="user-info"]',
  ].join(','),
  username: [
    '[data-e2e="user-nickname"]',
    '[data-e2e="user-profile-nickname"]',
  ].join(','),
  userId: [
    '[data-e2e="user-unique-id"]',
  ].join(','),
} as const;

// ============================================
// Search Result Selectors
// 
// 策略：基于 DOM 结构和内容，而非随机类名
// ============================================

export const SEARCH_SELECTORS = {
  /**
   * 搜索结果容器
   * 使用 data-e2e 属性或 ul 列表结构
   */
  container: [
    'ul[data-e2e="scroll-list"]',
    '[data-e2e="search-result-list"]',
    'ul:has(a[href*="/video/"])',
    'ul:has(a[href*="/user/"])',
  ].join(','),

  /**
   * 视频卡片
   * 策略：找到包含视频链接的容器
   */
  videoCard: [
    '.search-result-card:has(a[href*="/video/"])',
    '[data-e2e="search-video-card"]',
    'li:has(a[href*="/video/"])',
  ].join(','),

  /**
   * 用户卡片
   * 策略：找到包含用户链接（非 /user/self）的容器
   */
  userCard: [
    '.search-result-card:has(a[href*="/user/"]:not([href*="/user/self"]))',
    '[data-e2e="search-user-card"]',
    'li:has(a[href*="/user/"]:not([href*="/user/self"]))',
  ].join(','),

  /**
   * 视频链接 - 通过 href 属性匹配，最稳定
   */
  videoLink: 'a[href*="/video/"]',

  /**
   * 用户链接 - 通过 href 属性匹配，排除 self
   */
  userLink: 'a[href*="/user/"]:not([href*="/user/self"])',

  /**
   * 视频标题
   * 策略：卡片内的长文本，通常是第一个段落或标题区域
   */
  videoTitle: [
    '[data-e2e="video-title"]',
    // 标题通常在信息区域内，是较长的文本
    'p:has(span)',
    // 回退：找卡片内的段落
    '.search-result-card p',
  ].join(','),

  /**
   * 视频作者
   * 策略：带有 @ 符号的文本，或 "作者" 关键字附近
   */
  videoAuthor: [
    // 作者名通常在 @ 符号后面
    'span:has-text("@") + span',
    'span:has-text("@")',
    // 或包含 "@" 的容器内的文本
    '[class*="author"] span',
  ].join(','),

  /**
   * 用户昵称
   * 策略：用户卡片的第一个标题文本
   */
  userNickname: [
    '[data-e2e="user-nickname"]',
    // 用户卡片的第一个 p 元素通常是昵称
    '.search-result-card:has(a[href*="/user/"]) p:first-of-type',
  ].join(','),

  /**
   * 用户签名
   * 策略：用户卡片的最后一个段落，通常是签名
   */
  userSignature: [
    '[class*="signature"]',
    // 签名通常是卡片内最后一个段落
    '.search-result-card:has(a[href*="/user/"]) p:last-of-type',
  ].join(','),

  /**
   * 认证徽章
   * 策略：包含 "认证" 文本的元素
   */
  verifiedBadge: [
    ':has-text("认证")',
    '[class*="verified"]',
    '[class*="auth"]',
  ].join(','),

  /**
   * 发布时间
   * 策略：匹配时间格式（X天前、X周前、X小时前等）
   */
  timeAgo: [
    // 匹配时间格式：数字+时间单位+前
    'span:has-text("前"):has-text("天"), span:has-text("前"):has-text("周"), span:has-text("前"):has-text("小时"), span:has-text("前"):has-text("分钟")',
    '[class*="time"]',
  ].join(','),

  /**
   * 视频时长
   * 策略：匹配时间格式（HH:MM:SS 或 MM:SS）
   */
  duration: [
    // 时长通常在右上角，格式为 时间
    'span:has-text(":"):not(:has-text("@"))',
    '[class*="duration"]',
  ].join(','),

  /**
   * 点赞数
   * 策略：包含 "万" 或数字的统计元素
   */
  likeCount: [
    '[data-e2e="like-count"]',
    // 点赞数通常包含 "万" 或纯数字
    'span:has-text("万")',
  ].join(','),

  /**
   * 封面图片
   * 策略：卡片内的图片
   */
  coverImage: [
    '[data-e2e="video-cover"]',
    '.search-result-card img',
  ].join(','),

  /**
   * 加载指示器
   */
  loadingIndicator: [
    '[class*="loading"]',
    '[data-e2e="loading"]',
  ].join(','),

  /**
   * 卡片内的关注按钮
   */
  cardFollowButton: [
    '[data-e2e="follow-button"]',
    'button:has-text("关注")',
  ].join(','),

  /**
   * 信息区域
   * 策略：包含标题和作者的区域
   */
  infoSection: [
    '.search-result-card p',
    '[class*="info"]',
  ].join(','),
} as const;

// ============================================
// Search URL Patterns
// ============================================

export const SEARCH_URLS = {
  base: 'https://www.douyin.com/search/',
  build: (keyword: string, type: 'general' | 'video' | 'user' = 'general'): string => {
    const enc = encodeURIComponent(keyword);
    return 'https://www.douyin.com/search/' + enc + '?type=' + type;
  },
  types: {
    general: 'general',
    video: 'video',
    user: 'user',
  } as const,
} as const;
