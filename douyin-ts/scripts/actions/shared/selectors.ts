/**
 * Shared selectors for Douyin actions
 *
 * @module actions/shared/selectors
 * @description Platform-specific selectors for Douyin login, navigation, and interaction
 */

// ============================================
// Login Selectors
// ============================================

/** Login button selectors (used to trigger login modal) */
export const LOGIN_BUTTON_SELECTORS = [
  '[data-e2e="login-button"]',
  'button:has-text("登录")',
  'button:has-text("Login")',
  '[class*="login-button"]',
  '[class*="login-btn"]',
] as const;

/** Login modal container */
export const LOGIN_MODAL_SELECTOR = '[class*="login-container"], [class*="login-modal"], [data-e2e="login-modal"]';

/** User component (visible when logged in) */
export const USER_COMPONENT_SELECTOR = '[class*="user-info"], [data-e2e="user-info"], [class*="user-avatar"]';

/** QR code selectors */
export const QR_CODE_SELECTORS = [
  '[data-e2e="qrcode"]',
  'canvas[class*="qr"]',
  'img[class*="qr"]',
  '[class*="qrcode"]',
] as const;

/** QR tab selector (to switch to QR login tab) */
export const QR_TAB_SELECTOR = '[data-e2e="qr-tab"], button:has-text("扫码"), [class*="qr-tab"]';

// ============================================
// URL Constants
// ============================================

export const DY_URLS = {
  /** Douyin homepage */
  home: 'https://www.douyin.com',
  /** Douyin login page */
  login: 'https://www.douyin.com/login',
  /** Search base URL */
  searchBase: 'https://www.douyin.com/search/',
} as const;

// ============================================
// Timeouts
// ============================================

export const TIMEOUTS = {
  /** Page load timeout */
  pageLoad: 30000,
  /** Network idle timeout */
  networkIdle: 10000,
  /** Selector wait timeout */
  selector: 10000,
  /** Login timeout */
  login: 120000,
} as const;

// ============================================
// Interaction Delays
// ============================================

export const DELAYS = {
  /** After navigation */
  afterNavigation: { mean: 1000, stdDev: 300 },
  /** Between batch items */
  batchInterval: { mean: 2500, stdDev: 800 },
  /** Reading time */
  reading: { min: 2000, max: 5000 },
  /** Action delay */
  action: { min: 500, max: 1500 },
} as const;