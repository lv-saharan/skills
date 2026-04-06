/**
 * Shared selectors for session management
 *
 * @module actions/shared/selectors
 * @description CSS selectors used by session management and authentication
 *
 * These selectors are used across multiple action modules for:
 * - Login state detection
 * - Error page identification
 * - Common UI elements
 */

// ============================================
// Login State Selectors
// ============================================

/**
 * Login modal container selector
 * Used by session management to detect login prompts
 */
export const LOGIN_MODAL_SELECTOR = '.login-container';

/**
 * User component selector - visible when logged in
 * Used by session management to verify authentication state
 */
export const USER_COMPONENT_SELECTOR = '.user.side-bar-component';

/**
 * Login button selectors - ordered by specificity
 * Used for fallback login triggering
 */
export const LOGIN_BUTTON_SELECTORS = [
  '.login-btn',
  '[class*="loginButton"]',
  'button:has-text("登录")',
];

/**
 * QR code selectors for login detection
 */
export const QR_CODE_SELECTORS = ['[class*="qr"]', '.login-container canvas'];

/**
 * QR tab selector for switching to QR login
 */
export const QR_TAB_SELECTOR = '[class*="qr"]';

// ============================================
// Common Selector Arrays
// ============================================

/**
 * All login-related selectors as flat array
 * Useful for waiting for any login element to appear
 */
export const LOGIN_MODAL_SELECTORS = [
  LOGIN_MODAL_SELECTOR,
  ...LOGIN_BUTTON_SELECTORS,
  USER_COMPONENT_SELECTOR,
];
