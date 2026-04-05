/**
 * Scrape module selectors
 *
 * @module scrape/selectors
 * @description CSS selectors for scraping note and user data from Xiaohongshu pages
 *
 * NOTE: XHS page structure changes frequently. These selectors use multiple
 * fallback patterns for robustness.
 *
 * Verified: 2026-03-27
 */

// ============================================
// Note Page Selectors
// ============================================

/**
 * Selectors for note detail page
 * @status VERIFIED 2026-03-27
 *
 * Note page structure:
 * - Main container: .note-container or [class*="noteDetail"]
 * - Title: .title or [class*="title"]
 * - Content: .note-text or [class*="content"]
 * - Images: .swiper-slide img or .carousel img
 * - Video: video element
 * - Author: .author-wrapper or [class*="author"]
 * - Stats: .interact-container .count
 * - Tags: .tag or [class*="tag"]
 */
export const NOTE_SELECTORS = {
  // Container
  /** Main note container */
  container: '.note-container, [class*="noteDetail"], [class*="NoteDetail"], .note-detail',

  // Content
  /** Note title */
  title: '.title, [class*="title"], h1, .note-title',
  /** Note content/description */
  content: '.note-text, [class*="content"], [class*="Content"], .note-content, .desc',
  /** Content container for text extraction */
  contentContainer: '.note-content, [class*="noteContent"], .content-wrapper',

  // Media
  /** Image carousel/container */
  imageContainer: '.swiper-container, .carousel, [class*="swiper"], [class*="carousel"]',
  /** Image elements */
  image: '.swiper-slide img, .carousel img, [class*="swiper"] img, .note-image img',
  /** Video element */
  video: 'video',
  /** Video cover */
  videoCover: 'video[poster]',
  /** Video source */
  videoSource: 'video source, video[src]',

  // Author
  /** Author wrapper */
  authorWrapper: '.author-wrapper, [class*="author"], .user-nickname, .author-info',
  /** Author avatar */
  authorAvatar: '.author-wrapper img, [class*="author"] img, .avatar img, .user-avatar img',
  /** Author name */
  authorName: '.author-wrapper .name, [class*="author"] .name, .user-name, .username, .nickname',
  /** Author link (profile URL) */
  authorLink:
    '.author-wrapper a, [class*="author"] a[href*="/user/profile/"], a[href*="/user/profile/"]',

  // Stats
  /** Interact container (likes, collects, comments) */
  interactContainer: '.interact-container',
  /** Like count */
  likeCount: '.like-wrapper .count, [class*="like"] .count, .like-count',
  /** Collect count */
  collectCount: '.collect-wrapper .count, [class*="collect"] .count, .collect-count',
  /** Comment count */
  commentCount:
    '.chat-wrapper .count, [class*="chat"] .count, .comment-count, [class*="comment"] .count',
  /** Share count */
  shareCount: '.share-wrapper .count, [class*="share"] .count, .share-count',

  // Tags
  /** Tag container */
  tagContainer: '.tag-list, [class*="tag"], .tags-container',
  /** Individual tag */
  tag: '.tag, [class*="tag"] a, a[href*="/search_result?keyword="]',

  // Metadata
  /** Publish time */
  publishTime: '.date, [class*="date"], .time, [class*="time"], .publish-time',
  /** Location/IP */
  location: '.location, [class*="location"], .ip-location, [class*="ipLocation"]',

  // Comments
  /** Comments container */
  commentsContainer: '.comments-container, [class*="comments"], .comments-el',
  /** Comment item */
  commentItem: '.comment-item, [class*="commentItem"], .comment',
  /** Comment author */
  commentAuthor: '.comment-item .name, [class*="commentItem"] .name, .comment .username',
  /** Comment content */
  commentContent: '.comment-item .content, [class*="commentItem"] .content, .comment .text',
  /** Comment time */
  commentTime: '.comment-item .time, [class*="commentItem"] .time, .comment .date',
  /** Comment likes */
  commentLikes: '.comment-item .like .count, [class*="commentItem"] .count',
  /** Load more comments button */
  loadMoreComments:
    'button:has-text("展开更多评论"), button:has-text("查看更多"), [class*="more-comments"]',

  // At users (mentions)
  /** At user link */
  atUser: 'a[href*="/user/profile/"][class*="at"], [class*="mention"]',
} as const;

// ============================================
// User Page Selectors
// ============================================

/**
 * Selectors for user profile page
 * @status VERIFIED 2026-03-27
 *
 * User page structure:
 * - Main container: .user-profile or [class*="user"]
 * - Avatar: .avatar or .user-avatar
 * - Name: .user-name or .nickname
 * - Bio: .user-desc or .bio
 * - Stats: .stats or [class*="count"]
 * - Notes grid: .note-item or [class*="noteItem"]
 */
export const USER_SELECTORS = {
  // Container
  /** Main user profile container */
  container:
    '.user-profile, [class*="userProfile"], [class*="UserProfile"], .user-container, #user',

  // Profile
  /** User avatar */
  avatar: '.avatar img, .user-avatar img, [class*="avatar"] img',
  /** User name/nickname */
  name: '.user-name, .nickname, [class*="userName"], [class*="nickname"], .name',
  /** User bio/description */
  bio: '.user-desc, .bio, [class*="userDesc"], [class*="bio"], .description',
  /** RED ID (unique identifier) */
  redId: '.red-id, [class*="redId"], [class*="RED_ID"]',
  /** Location/IP */
  location: '.location, [class*="location"], .ip-location, [class*="ipLocation"]',
  /** User tags */
  userTag: '.user-tag, [class*="userTag"], .tag-item',

  // Stats
  /** Stats container */
  statsContainer: '.stats, [class*="stats"], .user-stats',
  /** Following count */
  followsCount: '[class*="follows"], .follows-count, [data-v-*]:has-text("关注")',
  /** Fans/followers count */
  fansCount: '[class*="fans"], .fans-count, [data-v-*]:has-text("粉丝")',
  /** Likes received count */
  likedCount: '[class*="liked"], .liked-count, [data-v-*]:has-text("获赞")',
  /** Notes count (may be shown differently) */
  notesCount: '.notes-count, [class*="notes"], [data-v-*]:has-text("笔记")',

  // Notes grid
  /** Notes container */
  notesContainer: '.notes-container, [class*="notesContainer"], .feeds-container',
  /** Note item in grid */
  noteItem: '.note-item, [class*="noteItem"]',
  /** Note cover image */
  noteCover: '.note-item img, [class*="noteItem"] img',
  /** Note title (hover to reveal) */
  noteTitle: '.note-item .title, [class*="noteItem"] [class*="title"]',
  /** Note likes */
  noteLikes: '.note-item .like .count, [class*="noteItem"] [class*="count"]',
  /** Note link */
  noteLink: '.note-item a, [class*="noteItem"] a[href*="/explore/"]',
  /** Video indicator */
  videoIndicator: '.video-icon, [class*="videoIcon"], .play-icon',

  // Follow button (for reference)
  /** Follow button */
  followButton: 'button:has-text("关注"), button:has-text("Follow"), [class*="follow-btn"]',

  // Navigation tabs
  /** Notes tab */
  notesTab: '[class*="tab"]:has-text("笔记"), a[href*="notes"]',
  /** Collects tab */
  collectsTab: '[class*="tab"]:has-text("收藏"), a[href*="collect"]',
  /** Likes tab */
  likesTab: '[class*="tab"]:has-text("赞过"), a[href*="like"]',
} as const;

// ============================================
// Error Detection Selectors
// ============================================

/**
 * Selectors for detecting error states
 */
export const ERROR_SELECTORS = {
  /** Page not found */
  notFound: '.not-found, [class*="notFound"], :text("页面不见了"), :text("内容不存在")',
  /** Private/locked account */
  privateAccount: '.private-account, [class*="private"], :text("该用户已设为私密")',
  /** Content unavailable */
  unavailable: ':text("暂时无法浏览"), :text("内容不可用"), [class*="unavailable"]',
  /** Login required */
  loginRequired: '.login-required, [class*="loginRequired"], :text("登录后查看")',
  /** Rate limited */
  rateLimited: ':text("操作过于频繁"), [class*="rateLimit"]',
} as const;
