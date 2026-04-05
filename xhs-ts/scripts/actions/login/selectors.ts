/**
 * Login module selectors
 *
 * @module login/selectors
 * @description CSS selectors for login functionality on Xiaohongshu
 *
 * NOTE: These selectors are used by:
 * - actions/login/* - Login operations
 * - core/anti-detect - checkLoginStatus() (via parameter injection)
 * - config/session - ensureLoginStatus() (will migrate)
 *
 * Verified: 2026-04-05
 */

import type { LoginSelectors } from '../../core/anti-detect';

// ============================================
// Login Selectors
// ============================================

/**
 * Login selectors for Xiaohongshu
 *
 * @description Selectors for login modal, buttons, QR code, and SMS login
 *
 * Structure:
 * - Login modal: .login-container
 * - Login buttons: Multiple fallback patterns
 * - User component (logged in): .user.side-bar-component
 * - QR code: Canvas element inside login container
 */
export const LOGIN_SELECTORS: LoginSelectors = {
  /** Login modal container */
  modal: '.login-container',

  /** Login button selectors - ordered by specificity */
  button: ['.login-btn', '[class*="loginButton"]', 'button:has-text("登录")'],

  /** User component - visible when logged in */
  userComponent: '.user.side-bar-component',
} as const;

// ============================================
// QR Code Selectors
// ============================================

/**
 * QR code selectors for login
 */
export const QR_SELECTORS: string[] = ['[class*="qr"]', '.login-container canvas'];

/** QR tab selector */
export const QR_TAB_SELECTOR = '[class*="qr"]';

// ============================================
// SMS Login Selectors
// ============================================

/**
 * SMS login selectors
 */
export const SMS_SELECTORS = {
  /** SMS tab selector */
  smsTab: '[class*="sms"]',
  /** Phone number input */
  phoneInput: 'input[type="tel"]',
  /** Send SMS button */
  sendSmsButton: 'button:has-text("发送")',
  /** SMS code input */
  smsCodeInput: 'input[maxlength="6"]',
} as const;

// ============================================
// Convenience Arrays
// ============================================

/**
 * Login button selectors as array
 */
export const LOGIN_BUTTON_SELECTORS = LOGIN_SELECTORS.button;

/**
 * Login modal selector (single string)
 */
export const LOGIN_MODAL_SELECTOR = LOGIN_SELECTORS.modal;

/**
 * User component selector
 */
export const USER_COMPONENT_SELECTOR = LOGIN_SELECTORS.userComponent;

/**
 * All login-related selectors as flat array
 * Useful for waiting for any login element to appear
 */
export const LOGIN_MODAL_SELECTORS = [
  LOGIN_SELECTORS.modal,
  ...LOGIN_SELECTORS.button,
  LOGIN_SELECTORS.userComponent,
];

// ============================================
// Type Exports
// ============================================

export type { LoginSelectors };
