/**
 * Shared Selectors - Single Source of Truth
 *
 * @module actions/shared/selectors
 * @description All CSS selectors for Xiaohongshu automation
 *
 * Verified: 2026-03-27
 */

// ============================================
// Login/Session Selectors
// ============================================

export const LOGIN_MODAL_SELECTOR = '.login-container';

export const USER_COMPONENT_SELECTOR = '.user.side-bar-component';

export const LOGIN_BUTTON_SELECTORS = [
  '.login-btn',
  '[class*="loginButton"]',
  'button:has-text("登录")',
] as const;

// ============================================
// Note Page Selectors (Unified)
// ============================================

export const NOTE_SELECTORS = {
  container: '.note-container, [class*="noteDetail"], [class*="NoteDetail"], .note-detail',
  content: '.note-content, [class*="noteContent"], [class*="NoteContent"]',
  contentContainer: '.note-content, [class*="noteContent"], .content-wrapper',
  interactContainer: '.interact-container',
  engagementBar: '.buttons.engage-bar-style',
  leftArea: '.left',
  title: '.title, [class*="title"], h1, .note-title',
  noteText: '.note-text, [class*="content"], [class*="Content"], .note-content, .desc',
  imageContainer: '.swiper-container, .carousel, [class*="swiper"], [class*="carousel"]',
  image: '.swiper-slide img, .carousel img, [class*="swiper"] img, .note-image img',
  video: 'video',
  videoCover: 'video[poster]',
  videoSource: 'video source, video[src]',
  authorWrapper: '.author-wrapper, [class*="author"], .user-nickname, .author-info',
  authorAvatar: '.author-wrapper img, [class*="author"] img, .avatar img, .user-avatar img',
  authorName: '.author-wrapper .name, [class*="author"] .name, .user-name, .username, .nickname',
  authorLink:
    '.author-wrapper a, [class*="author"] a[href*="/user/profile/"], a[href*="/user/profile/"]',
  likeCount: '.like-wrapper .count, [class*="like"] .count, .like-count',
  collectCount: '.collect-wrapper .count, [class*="collect"] .count, .collect-count',
  commentCount:
    '.chat-wrapper .count, [class*="chat"] .count, .comment-count, [class*="comment"] .count',
  shareCount: '.share-wrapper .count, [class*="share"] .count, .share-count',
  tagContainer: '.tag-list, [class*="tag"], .tags-container',
  tag: '.tag, [class*="tag"] a, a[href*="/search_result?keyword="]',
  publishTime: '.date, [class*="date"], .time, [class*="time"], .publish-time',
  location: '.location, [class*="location"], .ip-location, [class*="ipLocation"]',
  commentsContainer: '.comments-container, [class*="comments"], .comments-el',
  commentItem: '.comment-item, [class*="commentItem"], .comment',
  commentAuthor: '.comment-item .name, [class*="commentItem"] .name, .comment .username',
  commentContent: '.comment-item .content, [class*="commentItem"] .content, .comment .text',
  commentTime: '.comment-item .time, [class*="commentItem"] .time, .comment .date',
  commentLikes: '.comment-item .like .count, [class*="commentItem"] .count',
  loadMoreComments:
    'button:has-text("展开更多评论"), button:has-text("查看更多"), [class*="more-comments"]',
  atUser: 'a[href*="/user/profile/"][class*="at"], [class*="mention"]',
} as const;

// ============================================
// Like Button Selectors
// ============================================

export const LIKE_SELECTORS = {
  button: '.interact-container .buttons .like-wrapper',
  icon: '.like-wrapper .like-lottie, .like-wrapper svg, .like-wrapper [class*="like-icon"]',
  activeState: [
    '.like-wrapper.like-active',
    '.like-active',
    '[class*="like-active"]',
    '[class*="likeActive"]',
    '[class*="liked"]',
  ].join(', '),
  count: [':text(/^\d+$/)', ':text(/^\d+(\.\d+)?[万 kK]?$/)', '[class*="count"]'].join(', '),
} as const;

// ============================================
// Collect Button Selectors
// ============================================

export const COLLECT_SELECTORS = {
  button: '.interact-container .buttons .collect-wrapper',
  icon: ['svg', 'img', '[class*="collect-icon"]'].join(', '),
  activeState: [
    '.collect-wrapper.collect-active',
    '.collect-active',
    '[class*="collect-active"]',
    '[class*="collectActive"]',
    '[class*="collected"]',
  ].join(', '),
  count: [':text(/^\d+$/)', '[class*="count"]'].join(', '),
} as const;

// ============================================
// Comment Selectors
// ============================================

export const COMMENT_SELECTORS = {
  button: [
    '.chat-wrapper',
    '.left > .chat-wrapper',
    '.buttons.engage-bar-style .chat-wrapper',
    '.interact-container .chat-wrapper',
    '[class*="chat-wrapper"]',
    '[class*="comment"]',
  ].join(', '),
  input: [
    'textarea[placeholder*="评论"]',
    'textarea[placeholder*="说点什么"]',
    '.content-input',
    '[class*="content-edit"]',
    '#content-textarea',
  ].join(', '),
  submit: [
    'button:has-text("发送")',
    'button:has-text("发布")',
    '[class*="send"]',
    '[class*="Send"]',
  ].join(', '),
  list: '[class*="comments"], [class*="Comments"], .comments-el',
} as const;

// ============================================
// Follow Button Selectors
// ============================================

export const FOLLOW_SELECTORS = {
  primaryButton: '.reds-button-new.follow-button',
  fallbackButtons: [
    'button.follow-button',
    'button:has-text("关注")',
    'button:has-text("Follow")',
    '[class*="follow-btn"]',
    '[class*="followBtn"]',
  ].join(', '),
  button: [
    '.reds-button-new.follow-button',
    'button.follow-button',
    'button:has-text("关注")',
    'button:has-text("Follow")',
    '[class*="follow-btn"]',
    '[class*="followBtn"]',
  ].join(', '),
  userInfoContainer: [
    '[class*="user-info"]',
    '[class*="userInfo"]',
    '.user-info',
    '[class*="authorInfo"]',
    '[class*="author-info"]',
  ].join(', '),
  followingText: ['已关注', '互相关注', '相互关注', 'Following', 'following'].join(','),
  notFollowingText: ['关注', 'Follow', '+ 关注', '+ Follow'].join(','),
  userInfo: '[class*="user-info"], [class*="userInfo"], .user-info',
  username: '[class*="user-name"], [class*="userName"], .user-name',
} as const;

// ============================================
// User Page Selectors
// ============================================

export const USER_SELECTORS = {
  container:
    '.user-profile, [class*="userProfile"], [class*="UserProfile"], .user-container, #user',
  avatar: '.avatar img, .user-avatar img, [class*="avatar"] img',
  name: '.user-name, .nickname, [class*="userName"], [class*="nickname"], .name',
  bio: '.user-desc, .bio, [class*="userDesc"], [class*="bio"], .description',
  redId: '.red-id, [class*="redId"], [class*="RED_ID"]',
  location: '.location, [class*="location"], .ip-location, [class*="ipLocation"]',
  userTag: '.user-tag, [class*="userTag"], .tag-item',
  statsContainer: '.stats, [class*="stats"], .user-stats',
  followsCount: '[class*="follows"], .follows-count, [data-v-*]:has-text("关注")',
  fansCount: '[class*="fans"], .fans-count, [data-v-*]:has-text("粉丝")',
  likedCount: '[class*="liked"], .liked-count, [data-v-*]:has-text("获赞")',
  notesCount: '.notes-count, [class*="notes"], [data-v-*]:has-text("笔记")',
  notesContainer: '.notes-container, [class*="notesContainer"], .feeds-container',
  noteItem: '.note-item, [class*="noteItem"]',
  noteCover: '.note-item img, [class*="noteItem"] img',
  noteTitle: '.note-item .title, [class*="noteItem"] [class*="title"]',
  noteLikes: '.note-item .like .count, [class*="noteItem"] [class*="count"]',
  noteLink: '.note-item a, [class*="noteItem"] a[href*="/explore/"]',
  videoIndicator: '.video-icon, [class*="videoIcon"], .play-icon',
  followButton: 'button:has-text("关注"), button:has-text("Follow"), [class*="follow-btn"]',
  notesTab: '[class*="tab"]:has-text("笔记"), a[href*="notes"]',
  collectsTab: '[class*="tab"]:has-text("收藏"), a[href*="collect"]',
  likesTab: '[class*="tab"]:has-text("赞过"), a[href*="like"]',
} as const;
