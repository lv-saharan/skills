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
  /** Network idle timeout (20 seconds) */
  NETWORK_IDLE: 20000,
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

// ============================================
// Delay Constants (Unified)
// ============================================

/** Gaussian delay presets for behavioral timing */
export const DELAYS = {
  /** After navigation: pause to simulate reading */
  afterNavigation: { mean: 2000, stdDev: 400 },
  /** After click: pause to simulate human reaction */
  afterClick: { mean: 1200, stdDev: 300 },
  /** Between batch items (likes, collects, follows) */
  batchInterval: { mean: 3000, stdDev: 800 },
} as const;

/** Stealth behavior delay ranges by environment type */
export const STEALTH_DELAYS = {
  'gui-native': {
    action: { min: 500, max: 1500 },
    read: { min: 1000, max: 3000 },
  },
  headless: {
    action: { min: 1500, max: 3500 },
    read: { min: 2000, max: 5000 },
  },
} as const;
