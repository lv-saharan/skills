/**
 * Session Management (Re-export for backward compatibility)
 *
 * @module config/session
 * @deprecated Import from 'actions/shared' instead. This file is kept for backward compatibility.
 *
 * The actual implementation has been moved to actions/shared/session.ts
 * to fix the layering violation (config should not depend on actions).
 */

// ============================================
// Re-export from the new location
// ============================================

export {
  // Session API
  withSession,
  withAuthenticatedAction,
  type SessionContext,
  type SessionOptions,
  type AuthenticatedActionOptions,

  // Page Utilities
  navigateTo,
  checkPageHealth,
  preparePageForAction,

  // Batch Operations
  executeBatch,
  type BatchOptions,

  // Human Simulation
  waitForStable,
  humanScroll,

  // Constants
  INTERACTION_DELAYS,
} from '../actions/shared/session';

// ============================================
// Platform-specific utilities (kept here for compatibility)
// These are used by the auto-login flow
// ============================================

import type { Page } from 'playwright';
import { LOGIN_BUTTON_SELECTORS, LOGIN_MODAL_SELECTOR, USER_COMPONENT_SELECTOR } from './loader';
import { debugLog } from '../core/utils';
import { humanClick } from '../core/anti-detect';

/**
 * Check for error page
 * @deprecated Use checkPageHealth from actions/shared instead
 */
export async function checkErrorPage(
  page: Page
): Promise<{ isError: boolean; errorCode?: string; errorMsg?: string }> {
  try {
    const currentUrl = page.url();

    if (currentUrl.includes('/error') || currentUrl.includes('error_code')) {
      const urlObj = new URL(currentUrl);
      const errorCode = urlObj.searchParams.get('error_code') || undefined;
      const errorMsg = urlObj.searchParams.get('error_msg') || undefined;

      debugLog('Error page detected', { errorCode, errorMsg, url: currentUrl });
      return { isError: true, errorCode, errorMsg };
    }

    return { isError: false };
  } catch (error) {
    debugLog('Error checking error page:', error);
    return { isError: false };
  }
}

/**
 * Ensure login status is visible (trigger login modal if needed)
 * This is used by auto-login flow
 */
export async function ensureLoginStatus(
  page: Page,
  _options?: { timeout?: number }
): Promise<{ isLoggedIn: boolean; loginModalOpen?: boolean; triggered?: boolean; error?: string }> {
  try {
    const currentUrl = page.url();
    debugLog('ensureLoginStatus: ' + currentUrl);

    // Check for error page
    const errorResult = await checkErrorPage(page);
    if (errorResult.isError) {
      debugLog('Error page detected');
      return {
        isLoggedIn: false,
        error: `错误页面: ${errorResult.errorMsg || errorResult.errorCode || '未知错误'}`,
      };
    }

    // Check if login modal is already open
    const loginModalVisible = await page
      .locator(LOGIN_MODAL_SELECTOR)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (loginModalVisible) {
      debugLog('.login-container found → waiting for scan');
      return {
        isLoggedIn: false,
        loginModalOpen: true,
      };
    }

    // Check if user component is visible (logged in)
    const userComponentVisible = await page
      .locator(USER_COMPONENT_SELECTOR)
      .first()
      .isVisible({ timeout: 2000 })
      .catch(() => false);

    if (userComponentVisible) {
      debugLog('.user.side-bar-component found → logged in');
      return { isLoggedIn: true };
    }

    // Try to trigger login modal
    debugLog('Auto-triggering login modal...');

    for (const selector of LOGIN_BUTTON_SELECTORS) {
      const buttonVisible = await page
        .locator(selector)
        .first()
        .isVisible({ timeout: 2000 })
        .catch(() => false);

      if (buttonVisible) {
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
      }
    }

    debugLog('Cannot trigger login modal');
    return {
      isLoggedIn: false,
      error: '无法触发登录弹窗',
    };
  } catch (error) {
    debugLog('Error ensuring login status:', error);
    return {
      isLoggedIn: false,
      error: error instanceof Error ? error.message : '未知错误',
    };
  }
}

// Re-export simulateReading for compatibility
export { simulateReading } from '../core/anti-detect';
