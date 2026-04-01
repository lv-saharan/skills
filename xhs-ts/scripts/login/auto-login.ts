/**
 * Auto-login flow for seamless authentication
 *
 * @module login/auto-login
 * @description Automatically handle login when session is expired
 *
 * Flow:
 * - headless=false: Auto-start login flow, wait for user to complete
 * - headless=true: Return error code, caller should prompt user
 */

import type { Page } from 'playwright';
import type { UserName } from '../user/types';
import { TIMEOUTS } from '../shared';
import { debugLog, delay, waitForCondition } from '../utils/helpers';
import { ensureLoginStatus, checkLoginStatus, checkCaptcha } from '../utils/anti-detect';
import { outputQrCode } from '../utils/output';
import { getTmpFilePath } from '../config';
import { writeFile } from 'fs/promises';

// ============================================
// Constants
// ============================================

/** QR code selectors */
const QR_SELECTORS = ['img.qrcode-img', '.qrcode-img'] as const;

/** QR code tab selector */
const QR_TAB_SELECTOR = '[class*="qrcode-tab"], button:has-text("扫码")';

// ============================================
// Types
// ============================================

export interface EnsureLoginOptions {
  user: UserName;
  headless: boolean;
  timeout?: number;
}

export interface EnsureLoginResult {
  success: boolean;
  message?: string;
  qrPath?: string;
}

// ============================================
// Auto Login Flow
// ============================================

/**
 * Ensure user is logged in, auto-start login if needed
 *
 * @param page - Playwright page
 * @param options - Login options
 * @returns Login result
 */
export async function ensureLogin(
  page: Page,
  options: EnsureLoginOptions
): Promise<EnsureLoginResult> {
  const { user, headless, timeout = TIMEOUTS.LOGIN } = options;

  // Use ensureLoginStatus to check and auto-trigger login modal
  const status = await ensureLoginStatus(page);

  if (status.isLoggedIn) {
    debugLog('User already logged in');
    return { success: true, message: 'Already logged in' };
  }

  // If there's an error (e.g., error page), return it
  if (status.error) {
    return { success: false, message: status.error };
  }

  // If login modal is not open, headless mode cannot proceed
  if (!status.loginModalOpen) {
    if (headless) {
      debugLog('Headless mode: cannot auto-login, prompting user');
      return {
        success: false,
        message: `Not logged in. Please run: npm run login -- --user ${user}`,
      };
    }

    // Try to trigger login modal again
    const retried = await ensureLoginStatus(page);
    if (!retried.loginModalOpen) {
      return {
        success: false,
        message: 'Cannot trigger login modal. Please login manually.',
      };
    }
  }

  // headless mode: cannot wait for QR scan
  if (headless) {
    return {
      success: false,
      message: `Not logged in. Please run: npm run login -- --user ${user}`,
    };
  }

  // GUI mode: proceed with QR code detection and wait for scan
  return await waitForQrScan(page, { user, timeout });
}

/**
 * Wait for QR code scan and login completion
 */
async function waitForQrScan(
  page: Page,
  options: { user: UserName; timeout: number }
): Promise<EnsureLoginResult> {
  const { user, timeout } = options;

  try {
    // Step 1: Switch to QR code tab if needed
    debugLog('Looking for QR code tab...');
    const qrTab = page.locator(QR_TAB_SELECTOR).first();
    if (await qrTab.isVisible().catch(() => false)) {
      debugLog('Found QR code tab, clicking...');
      await qrTab.click();
      await delay(500);
    }

    // Step 2: Find and save QR code
    debugLog('Waiting for QR code...');
    let qrPath: string | undefined;

    for (const selector of QR_SELECTORS) {
      const qrElement = page.locator(selector).first();
      if (await qrElement.isVisible().catch(() => false)) {
        debugLog('QR code found: ' + selector);

        try {
          // Wait for element to be stable before screenshot
          await qrElement.waitFor({ state: 'visible', timeout: 5000 });
          await delay(500);

          const buffer = await qrElement.screenshot({ type: 'png', timeout: 10000 });
          qrPath = getTmpFilePath('qr_login', 'png', user);
          await writeFile(qrPath, buffer);
          debugLog('QR code saved to: ' + qrPath);

          // Output QR path for agent communication
          outputQrCode(qrPath);
        } catch (error) {
          debugLog('Failed to save QR code:', error);
        }
        break;
      }
    }

    if (!qrPath) {
      debugLog('QR code not found, but modal is open. Waiting for scan...');
    }

    // Step 3: Wait for user to scan QR code
    debugLog('Waiting for user to scan QR code...');

    await waitForCondition(
      async () => {
        // Check for login success
        const loggedIn = await checkLoginStatus(page);
        if (loggedIn) {
          return true;
        }

        // Check for captcha
        const hasCaptcha = await checkCaptcha(page);
        if (hasCaptcha) {
          debugLog('Captcha detected during login');
        }

        return false;
      },
      {
        timeout,
        interval: 1000,
        timeoutMessage: 'Login timeout - QR code not scanned',
      }
    );

    debugLog('Login successful!');
    return { success: true, message: 'Login successful', qrPath };
  } catch (error) {
    debugLog('Login timeout or error:', error);
    return {
      success: false,
      message: 'Login timeout. Please try again.',
    };
  }
}

// ============================================
// Export
// ============================================

export default ensureLogin;
