/**
 * Interact selectors
 *
 * @module actions/interact/selectors
 * @description CSS selectors for interaction operations
 */

// ============================================
// Note Selectors
// ============================================

export const NOTE_SELECTORS = {
  container: '[class*="note-container"]',
  content: '[class*="note-content"]',
} as const;

// ============================================
// Like Selectors
// ============================================

export const LIKE_SELECTORS = {
  button: [
    '[data-e2e="like-icon"]',
    '[data-e2e="digg-icon"]',
    'button:has-text("赞")',
    '[class*="like-icon"]',
    '[class*="digg"]',
  ].join(','),
  icon: 'svg',
  activeState: '[class*="liked"], [class*="active"]',
} as const;

// ============================================
// Collect Selectors
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
} as const;

// ============================================
// Follow Selectors
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
  ].join(','),
} as const;

// ============================================
// Search Selectors
// ============================================

export const SEARCH_SELECTORS = {
  container: 'ul[data-e2e="scroll-list"], [data-e2e="search-result-list"]',
  videoCard: '.search-result-card:has(a[href*="/video/"])',
  userCard: '.search-result-card:has(a[href*="/user/"])',
  videoLink: 'a[href*="/video/"]',
  userLink: 'a[href*="/user/"]:not([href*="/user/self"])',
  videoTitle: '[data-e2e="video-title"], .search-result-card p',
  videoAuthor: 'span:has-text("@")',
  userNickname: '[data-e2e="user-nickname"]',
  coverImage: '.search-result-card img',
  timeAgo: 'span:has-text("前")',
  duration: 'span:has-text(":"):not(:has-text("@"))',
  likeCount: '[data-e2e="like-count"], span:has-text("万")',
} as const;

// ============================================
// Search URLs
// ============================================

export const SEARCH_URLS = {
  base: 'https://www.douyin.com/search/',
  build: (keyword: string): string => {
    return 'https://www.douyin.com/search/' + encodeURIComponent(keyword);
  },
} as const;