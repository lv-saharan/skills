/**
 * Browser-specific authentication utilities
 *
 * @module core/browser/auth
 * @description Login status detection for browser automation.
 *
 * This module lives in core/browser because:
 * - It requires Playwright Page (browser-specific, not platform-agnostic)
 * - It is needed by both actions/shared/ and actions/auth/ layers
 * - It does NOT belong in anti-detect (login detection ≠ anti-detection)
 */

import type { Page } from 'playwright';
import { debugLog } from '../utils/logging';

// ============================================
// Types
// ============================================

/**
 * Login selectors configuration (platform-specific)
 */
export interface LoginSelectors {
  /** Login modal container */
  modal: string;
  /** Login button(s) */
  button: string | string[];
  /** User component (logged in indicator) */
  userComponent: string;
  /** User avatar (optional, alternative logged in indicator) */
  avatar?: string | string[];
}

// ============================================
// Login Status Detection
// ============================================

/**
 * Check if user is logged in by inspecting page DOM.
 *
 * Detection logic:
 * 1. If login modal is visible → not logged in
 * 2. If user component is visible → logged in
 * 3. Otherwise → not logged in
 *
 * @param page - Playwright page
 * @param selectors - Platform-specific login selectors (optional, uses Xiaohongshu defaults)
 * @returns Whether user is logged in
 */
export async function checkLoginStatus(page: Page, selectors?: LoginSelectors): Promise<boolean> {
  try {
    const userComponent = selectors?.userComponent ?? '.user.side-bar-component';
    const avatar = selectors?.avatar;
    const modal = selectors?.modal ?? '.login-container';

    const userSelectors = [
      userComponent,
      ...(avatar ? (Array.isArray(avatar) ? avatar : [avatar]) : []),
    ].join(', ');

    // Check login modal first - if visible, definitely not logged in
    const modalVisible = await page
      .locator(modal)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (modalVisible) {
      return false;
    }

    // Modal not visible - check user component to confirm login
    const userVisible = await page
      .locator(userSelectors)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    return userVisible;
  } catch (error) {
    debugLog('Error checking login status:', error);
    return false;
  }
}
