/**
 * Login Status Detection - Single Source of Truth
 *
 * @module auth/status
 * @description Unified login state detection for Xiaohongshu automation.
 *
 * This module is the ONLY place where login status is determined.
 * All other modules should import from here, not implement their own detection.
 *
 * Detection logic:
 * 1. Wait for page to stabilize
 * 2. Check for error page
 * 3. Check login modal (.login-container) → if visible, not logged in
 * 4. Check user component (.user.side-bar-component) → if visible, logged in
 * 5. URL inference (/explore without modal → logged in)
 */

import type { Page } from 'playwright';
import { timeouts } from '../../config/loader';
import { delay, debugLog } from '../../core/utils';
import { checkErrorPage } from './check-error';
import { checkLoginStatus } from '../../core/browser/auth';

// ============================================
// Types
// ============================================

/**
 * Detailed login status result
 */
export interface LoginStatus {
  /** Whether user is logged in */
  isLoggedIn: boolean;
  /** Whether login modal is currently visible */
  loginModalOpen: boolean;
  /** Error message if detection failed or error page detected */
  error?: string;
}

// ============================================
// Core Detection
// ============================================

/**
 * Detect detailed login status.
 *
 * Waits for page stabilization, then checks:
 * - Error page presence
 * - Login modal visibility
 * - User component visibility (logged-in indicator)
 * - URL-based inference
 *
 * @param page - Playwright page
 * @returns Detailed login status
 */
export async function detectLoginStatus(page: Page): Promise<LoginStatus> {
  try {
    // Wait for page to stabilize
    await page.waitForLoadState('domcontentloaded', { timeout: timeouts.pageLoad }).catch(() => {});
    await page.waitForLoadState('networkidle', { timeout: timeouts.networkIdle }).catch(() => {});
    await delay(1500);

    const currentUrl = page.url();
    debugLog('detectLoginStatus: ' + currentUrl);

    // Check for error page
    const errorResult = await checkErrorPage(page);
    if (errorResult.isError) {
      debugLog('Error page detected');
      return {
        isLoggedIn: false,
        loginModalOpen: false,
        error: `错误页面：${errorResult.errorMsg || errorResult.errorCode || '未知错误'}`,
      };
    }

    // Use checkLoginStatus for modal + user component detection
    const loggedIn = await checkLoginStatus(page);

    if (loggedIn) {
      debugLog('User is logged in');
      return { isLoggedIn: true, loginModalOpen: false };
    }

    // Not logged in — check if modal is open
    const { LOGIN_MODAL_SELECTOR } = await import('../shared/selectors');
    const modalVisible = await page
      .locator(LOGIN_MODAL_SELECTOR)
      .first()
      .isVisible({ timeout: timeouts.selector })
      .catch(() => false);

    if (modalVisible) {
      debugLog(LOGIN_MODAL_SELECTOR + ' found -> not logged in, modal open');
      return { isLoggedIn: false, loginModalOpen: true };
    }

    // URL-based inference
    const isOnExplorePage = currentUrl.includes('/explore');
    const isOnLoginPage = currentUrl.includes('/login');

    if (isOnExplorePage && !isOnLoginPage) {
      debugLog('On /explore without login modal -> assuming logged in');
      return { isLoggedIn: true, loginModalOpen: false };
    }

    // Not logged in, modal not open
    debugLog('Not logged in and modal not open');
    return { isLoggedIn: false, loginModalOpen: false };
  } catch (error) {
    debugLog('Error detecting login status:', error);
    return {
      isLoggedIn: false,
      loginModalOpen: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * Quick login check — returns boolean only.
 *
 * Calls detectLoginStatus internally and extracts isLoggedIn.
 * Use when you only need a yes/no answer.
 *
 * @param page - Playwright page
 * @returns Whether user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const status = await detectLoginStatus(page);
  return status.isLoggedIn;
}
