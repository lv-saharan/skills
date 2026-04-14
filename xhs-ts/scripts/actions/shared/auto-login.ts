/**
 * Auto Login - Automatic login orchestration
 *
 * @module actions/shared/auto-login
 * @description Orchestrates automatic login flow: detect state -> trigger modal -> wait for scan
 *
 * This module bridges the gap between:
 * - auth/status.ts (state detection)
 * - login/qr.ts (QR login implementation)
 *
 * IMPORTANT: This module was moved from login/auto-login.ts to resolve
 * circular dependency between shared and login modules.
 *
 * Used by: shared/session.ts for automatic authentication
 */

import type { Page } from 'playwright';
import type { UserName } from '../../user';
import { timeouts } from '../../config/loader';
import { delay, debugLog } from '../../core/utils';
import { humanClick } from '../../core/anti-detect';
import { detectLoginStatus } from '../auth/status';
import { waitForQrScan } from '../login/qr';
import { LOGIN_BUTTON_SELECTORS } from './selectors';
import { urls } from '../../config';

// ============================================
// Types
// ============================================

/**
 * Options for autoLogin
 */
export interface AutoLoginOptions {
  user: UserName;
  timeout?: number;
}

/**
 * Result of autoLogin
 */
export interface AutoLoginResult {
  success: boolean;
  message?: string;
  qrPath?: string;
  didAutoLogin: boolean;
}

// ============================================
// Auto Login Implementation
// ============================================

/**
 * Automatically login user
 *
 * Flow:
 * 1. Check current login status
 * 2. If not logged in, trigger login modal
 * 3. Wait for QR code scan
 *
 * @param page - Playwright page
 * @param options - Auto login options
 * @returns Login result
 */
export async function autoLogin(page: Page, options: AutoLoginOptions): Promise<AutoLoginResult> {
  const { timeout = timeouts.login } = options;

  // Step 1: Check current status
  const status = await detectLoginStatus(page);

  if (status.isLoggedIn) {
    debugLog('User already logged in');
    return { success: true, message: 'Already logged in', didAutoLogin: false };
  }

  // If there's an error (e.g., error page), return it
  if (status.error) {
    return { success: false, message: status.error, didAutoLogin: false };
  }

  // Step 2: Trigger login modal if not already open
  if (!status.loginModalOpen) {
    const triggered = await triggerLoginModal(page);
    if (!triggered) {
      return {
        success: false,
        message: 'Cannot trigger login modal. Please login manually.',
        didAutoLogin: false,
      };
    }
  }

  // Step 3: Wait for QR scan
  try {
    await waitForQrScan(page, timeout);
    return {
      success: true,
      message: 'Login successful',
      didAutoLogin: true,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Login failed',
      didAutoLogin: true,
    };
  }
}

// ============================================
// Login Modal Triggering
// ============================================

/**
 * Trigger login modal from page
 *
 * @param page - Playwright page
 * @returns Whether modal was triggered
 */
async function triggerLoginModal(page: Page): Promise<boolean> {
  debugLog('Triggering login modal...');

  // Try clicking login buttons
  for (const selector of LOGIN_BUTTON_SELECTORS) {
    try {
      const button = page.locator(selector).first();
      await button.waitFor({ state: 'visible', timeout: 3000 }).catch(() => null);

      if (await button.isVisible().catch(() => false)) {
        debugLog('Clicking login button: ' + selector);
        const clicked = await humanClick(page, selector, { delayAfter: 2000 });

        if (clicked) {
          // Verify modal appeared
          const modalVisible = await page
            .locator('.login-container')
            .first()
            .isVisible({ timeout: 5000 })
            .catch(() => false);

          if (modalVisible) {
            debugLog('Login modal triggered successfully');
            return true;
          }
        }
      }
    } catch {
      continue;
    }
  }

  // Fallback: Navigate to login page
  debugLog('Login button not found, navigating to login page...');
  await page.goto(urls.login, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
  await delay(1500);

  const modalVisible = await page
    .locator('.login-container')
    .first()
    .isVisible({ timeout: 5000 })
    .catch(() => false);

  if (modalVisible) {
    debugLog('Login modal visible on login page');
    return true;
  }

  debugLog('Failed to trigger login modal');
  return false;
}
