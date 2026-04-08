/**
 * Ensure Login Status - State Detection Only
 *
 * @module auth/ensure-status
 * @description Detect login status WITHOUT performing login operations
 *
 * This module is the SINGLE source of truth for login state detection.
 * It does NOT perform any login actions - those are in login/auto-login.ts
 *
 * Used by:
 * - login/auto-login.ts - to check if login is needed
 * - shared/session.ts - to verify authentication before actions
 * - shared/page-utils.ts - to check page health
 */

import type { Page } from 'playwright';
import { timeouts } from '../../config/loader';
import { delay, debugLog } from '../../core/utils';
import { checkErrorPage } from './check-error';
import {
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  LOGIN_BUTTON_SELECTORS,
} from '../shared/selectors';

// ============================================
// Types
// ============================================

/**
 * Result of ensureLoginStatus
 */
export interface EnsureLoginStatusResult {
  /** Whether user is logged in */
  isLoggedIn: boolean;
  /** Whether login modal is currently open */
  loginModalOpen?: boolean;
  /** Whether login modal was triggered by this call */
  triggered?: boolean;
  /** Error message if any */
  error?: string;
}

// ============================================
// Login Status Detection
// ============================================

/**
 * Detect current login status
 *
 * This function ONLY detects state - it does NOT trigger any login UI.
 * Use ensureLoginStatusWithTrigger() if you need to auto-trigger login modal.
 *
 * @param page - Playwright page
 * @returns Login status result
 */
export async function ensureLoginStatus(page: Page): Promise<EnsureLoginStatusResult> {
  try {
    // CRITICAL: Wait for page to stabilize BEFORE any checks
    // Safe to ignore - page may already be loaded
    await page.waitForLoadState('domcontentloaded', { timeout: timeouts.pageLoad }).catch(() => {});
    // Safe to ignore - page may never reach network idle if still loading dynamic content
    await page.waitForLoadState('networkidle', { timeout: timeouts.networkIdle }).catch(() => {});
    await delay(1500); // Extra buffer for dynamic content (JS rendering)

    const currentUrl = page.url();
    debugLog('ensureLoginStatus: ' + currentUrl);

    // Check for error page
    const errorResult = await checkErrorPage(page);
    if (errorResult.isError) {
      debugLog('Error page detected');
      return {
        isLoggedIn: false,
        error: `错误页面：${errorResult.errorMsg || errorResult.errorCode || '未知错误'}`,
      };
    }

    // Check if login modal is already open
    const loginModalVisible = await page
      .locator(LOGIN_MODAL_SELECTOR)
      .first()
      .isVisible({ timeout: timeouts.selector })
      .catch(() => false);

    if (loginModalVisible) {
      debugLog('.login-container found -> waiting for scan');
      return {
        isLoggedIn: false,
        loginModalOpen: true,
      };
    }

    // Check if user component is visible (logged in)
    const userComponentVisible = await page
      .locator(USER_COMPONENT_SELECTOR)
      .first()
      .isVisible({ timeout: timeouts.selector })
      .catch(() => false);

    if (userComponentVisible) {
      debugLog('.user.side-bar-component found -> logged in');
      return { isLoggedIn: true };
    }

    // URL-based login detection
    const isOnExplorePage = currentUrl.includes('/explore');
    const isOnLoginPage = currentUrl.includes('/login');

    if (isOnExplorePage && !isOnLoginPage && !loginModalVisible) {
      debugLog('On /explore without login modal -> assuming logged in');
      return { isLoggedIn: true };
    }

    // Not logged in
    debugLog('Not logged in and modal not open');
    return {
      isLoggedIn: false,
      loginModalOpen: false,
    };
  } catch (error) {
    debugLog('Error ensuring login status:', error);
    return {
      isLoggedIn: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

/**
 * Detect login status with optional auto-trigger
 *
 * If forceTrigger is true and user is not logged in, will attempt to
 * trigger the login modal by clicking login buttons.
 *
 * @param page - Playwright page
 * @param options - Options including forceTrigger
 * @returns Login status result
 */
export async function ensureLoginStatusWithTrigger(
  page: Page,
  options?: { forceTrigger?: boolean }
): Promise<EnsureLoginStatusResult> {
  const { forceTrigger = false } = options || {};

  // First check status without triggering
  const status = await ensureLoginStatus(page);

  // Return early if logged in or no trigger needed
  if (status.isLoggedIn || !forceTrigger || status.loginModalOpen) {
    return status;
  }

  // Attempt to trigger login modal
  return triggerLoginModalFromStatus(page);
}

// ============================================
// Internal Helpers
// ============================================

/**
 * Trigger login modal (internal helper)
 */
async function triggerLoginModalFromStatus(page: Page): Promise<EnsureLoginStatusResult> {
  const { urls } = await import('../../config');
  const { humanClick } = await import('../../core/anti-detect');

  debugLog('Auto-triggering login modal...');

  for (const selector of LOGIN_BUTTON_SELECTORS) {
    try {
      const button = page.locator(selector).first();
      await button.waitFor({ state: 'visible', timeout: timeouts.selector });
      debugLog(`Clicking login button: ${selector}`);

      const clicked = await humanClick(page, selector, { delayAfter: 2000 });

      if (clicked) {
        const modalAppeared = await page
          .locator(LOGIN_MODAL_SELECTOR)
          .first()
          .isVisible({ timeout: 5000 })
          .catch(() => false);

        if (modalAppeared) {
          debugLog('Login modal triggered successfully');
          return {
            isLoggedIn: false,
            loginModalOpen: true,
            triggered: true,
          };
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback: navigate to /login page if login button not found
  debugLog('Login button not found, navigating to /login page...');
  await page.goto(urls.login, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
  // Safe to ignore - page may never reach network idle if still loading dynamic content
  await page.waitForLoadState('networkidle', { timeout: timeouts.networkIdle }).catch(() => {});
  await delay(1000);

  const loginModalOnLoginPage = await page
    .locator(LOGIN_MODAL_SELECTOR)
    .first()
    .isVisible({ timeout: timeouts.selector })
    .catch(() => false);

  if (loginModalOnLoginPage) {
    debugLog('Login modal visible on /login page');
    return {
      isLoggedIn: false,
      loginModalOpen: true,
      triggered: true,
    };
  }

  debugLog('Cannot trigger login modal');
  return {
    isLoggedIn: false,
    error: '无法触发登录弹窗',
  };
}
