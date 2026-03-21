/**
 * Shared constants
 *
 * @module shared/constants
 * @description Global constants used across modules
 */

// ============================================
// Timeout Constants
// ============================================

/** Standard timeout values */
export const TIMEOUTS = {
  /** Page load timeout (60 seconds default, configurable via PAGE_LOAD_TIMEOUT env) */
  PAGE_LOAD: parseInt(process.env.PAGE_LOAD_TIMEOUT || '60000', 10),
  /** Upload timeout (2 minutes) */
  UPLOAD: 120000,
  /** Login timeout (2 minutes) */
  LOGIN: 120000,
  /** Selector wait timeout (15 seconds) */
  SELECTOR: 15000,
  /** QR check interval (1 second) */
  QR_CHECK_INTERVAL: 1000,
} as const;

// ============================================
// URL Constants
// ============================================

/** Xiaohongshu base URLs */
export const XHS_URLS = {
  home: 'https://www.xiaohongshu.com',
  login: 'https://www.xiaohongshu.com/login',
  explore: 'https://www.xiaohongshu.com/explore',
  creator: 'https://creator.xiaohongshu.com',
  creatorPublish: 'https://creator.xiaohongshu.com/publish/publish?source=official',
} as const;
