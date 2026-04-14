/**
 * Login module selectors
 *
 * @module login/selectors
 * @description CSS selectors for login-specific functionality on Xiaohongshu
 *
 * NOTE: Shared login selectors (LOGIN_MODAL_SELECTOR, USER_COMPONENT_SELECTOR,
 * LOGIN_BUTTON_SELECTORS, LOGIN_MODAL_SELECTORS) are now in shared/selectors.ts
 *
 * This file only contains login-method-specific selectors:
 * - QR code login selectors
 * - SMS login selectors
 *
 * Verified: 2026-04-07
 */

import type { LoginSelectors } from '../../core/browser/auth';

// ============================================
// Login Selectors Structure
// ============================================

/**
 * Login selectors for Xiaohongshu
 *
 * @description Selectors structure for login functionality
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
// QR Code Selectors (Login-specific)
// ============================================

/**
 * QR code selectors for login
 */
export const QR_SELECTORS: string[] = ['[class*="qr"]', '.login-container canvas'];

/** QR tab selector */
export const QR_TAB_SELECTOR = '[class*="qr"]';

// ============================================
// SMS Login Selectors (Login-specific)
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
// Type Exports
// ============================================

export type { LoginSelectors };
