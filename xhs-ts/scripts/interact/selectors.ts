/**
 * Interact module selectors
 *
 * @module interact/selectors
 * @description CSS selectors for interaction elements on Xiaohongshu pages
 *
 * NOTE: XHS page structure changes frequently. These selectors use multiple
 * fallback patterns for robustness. If a selector fails, try the next one.
 *
 * Verified: 2026-03-27
 * Structure: .interact-container .buttons.engage-bar-style .left
 *   - .like-wrapper (点赞)
 *   - .collect-wrapper (收藏)
 *   - .chat-wrapper (评论)
 */

// ============================================
// Note Page Selectors
// ============================================

/** Selectors for note detail page
 * @status NOT_IMPLEMENTED - Reserved for future use
 */
export const NOTE_SELECTORS = {
  /** Note container */
  container: '.note-container, [class*="noteDetail"], [class*="NoteDetail"]',
  /** Note content area */
  content: '.note-content, [class*="noteContent"], [class*="NoteContent"]',
  /** Interact container - holds all engagement buttons */
  interactContainer: '.interact-container',
  /** Engagement bar - buttons area */
  engagementBar: '.buttons.engage-bar-style',
  /** Left area - contains like, collect, chat buttons */
  leftArea: '.left',
} as const;

// ============================================
// Like Button Selectors
// ============================================

/**
 * Selectors for like button
 * @status IMPLEMENTED
 *
 * IMPORTANT: XHS like button structure (verified 2026-03):
 * - Class: .like-wrapper (in .interact-container .buttons.engage-bar-style .left)
 * - Active state: .like-wrapper.like-active
 * - Contains: .like-lottie (animation) + count text
 */
export const LIKE_SELECTORS = {
  /**
   * Like button selectors - ordered by specificity
   */
  button: '.interact-container .buttons .like-wrapper',

  /** Like icon/animation inside button */
  icon: '.like-wrapper .like-lottie, .like-wrapper svg, .like-wrapper [class*="like-icon"]',

  /**
   * Active/liked state indicators
   * When liked: .like-wrapper.like-active
   */
  activeState: [
    '.like-wrapper.like-active',
    '.like-active',
    '[class*="like-active"]',
    '[class*="likeActive"]',
    '[class*="liked"]',
  ].join(', '),

  /** Count element (likes count) */
  count: [':text(/^\d+$/)', ':text(/^\d+(\.\d+)?[万kK]?$/)', '[class*="count"]'].join(', '),
} as const;

// ============================================
// Collect Button Selectors
// ============================================

/**
 * Selectors for collect (bookmark) button
 * @status NOT_IMPLEMENTED - Reserved for future use
 *
 * Structure: .interact-container .buttons.engage-bar-style .left .collect-wrapper
 * Active state: .collect-wrapper.collect-active
 */
export const COLLECT_SELECTORS = {
  /**
   * Collect button selectors - ordered by specificity
   */
  button: '.interact-container .buttons .collect-wrapper',

  /** Collect icon inside button */
  icon: ['svg', 'img', '[class*="collect-icon"]'].join(', '),

  /** Active/collected state: .collect-wrapper.collect-active */
  activeState: [
    '.collect-wrapper.collect-active',
    '.collect-active',
    '[class*="collect-active"]',
    '[class*="collectActive"]',
    '[class*="collected"]',
  ].join(', '),

  /** Count element */
  count: [':text(/^\d+$/)', '[class*="count"]'].join(', '),
} as const;

// ============================================
// Comment Selectors
// ============================================

/**
 * Selectors for comment section
 * @status NOT_IMPLEMENTED - Reserved for future use
 *
 * Comment button: .chat-wrapper (in .left area)
 */
export const COMMENT_SELECTORS = {
  /** Comment button selectors */
  button: [
    '.chat-wrapper',
    '.left > .chat-wrapper',
    '.buttons.engage-bar-style .chat-wrapper',
    '.interact-container .chat-wrapper',
    '[class*="chat-wrapper"]',
    '[class*="comment"]',
  ].join(', '),

  /** Comment input field */
  input: [
    'textarea[placeholder*="评论"]',
    'textarea[placeholder*="说点什么"]',
    '.content-input',
    '[class*="content-edit"]',
    '#content-textarea',
  ].join(', '),

  /** Comment submit button */
  submit: [
    'button:has-text("发送")',
    'button:has-text("发布")',
    '[class*="send"]',
    '[class*="Send"]',
  ].join(', '),

  /** Comments list container */
  list: '[class*="comments"], [class*="Comments"], .comments-el',
} as const;

// ============================================
// Follow Button Selectors
// ============================================

/**
 * Selectors for follow button
 * @status IMPLEMENTED
 *
 * IMPORTANT: XHS follow button structure (verified 2026-03-27):
 * - Button class: .reds-button-new.follow-button (primary, most specific)
 * - Button text: "关注" / "+ 关注" (not following) or "已关注" (following)
 * - Located on user profile page, inside user info section
 *
 * NOTE: Page may have multiple follow buttons (recommended users section).
 * We need to target the MAIN follow button in the user info area.
 */
export const FOLLOW_SELECTORS = {
  /**
   * Primary follow button selector - most specific
   * This is the main follow button on user profile page
   */
  primaryButton: '.reds-button-new.follow-button',

  /**
   * Fallback selectors for follow button - ordered by specificity
   * Used when primary selector is not found
   */
  fallbackButtons: [
    'button.follow-button',
    'button:has-text("关注")',
    'button:has-text("Follow")',
    '[class*="follow-btn"]',
    '[class*="followBtn"]',
  ].join(', '),

  /**
   * Combined selector string for backward compatibility
   * @deprecated Use primaryButton and fallbackButtons separately
   */
  button: [
    '.reds-button-new.follow-button',
    'button.follow-button',
    'button:has-text("关注")',
    'button:has-text("Follow")',
    '[class*="follow-btn"]',
    '[class*="followBtn"]',
  ].join(', '),

  /**
   * User info container - the main area containing user profile info
   * The follow button should be inside this container
   */
  userInfoContainer: [
    '[class*="user-info"]',
    '[class*="userInfo"]',
    '.user-info',
    '[class*="authorInfo"]',
    '[class*="author-info"]',
  ].join(', '),

  /**
   * Following/unfollow state indicators
   * When following: button shows "已关注" or "Following"
   */
  followingText: ['已关注', '互相关注', '相互关注', 'Following', 'following'].join(','),

  /**
   * Not following state indicators
   * When not following: button shows "关注" or "Follow" or "+ 关注"
   */
  notFollowingText: ['关注', 'Follow', '+ 关注', '+ Follow'].join(','),

  /** User info container on profile page */
  userInfo: '[class*="user-info"], [class*="userInfo"], .user-info',

  /** Username element */
  username: '[class*="user-name"], [class*="userName"], .user-name',
} as const;
