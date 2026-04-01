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
import { humanClick, checkLoginStatus, checkCaptcha } from '../utils/anti-detect';
import { outputQrCode } from '../utils/output';
import { getTmpFilePath } from '../config';
import { writeFile } from 'fs/promises';

// ============================================
// Constants
// ============================================

/** Login button selectors */
const LOGIN_BUTTON_SELECTORS = [
  'header button:has-text("登录")',
  'header a:has-text("登录")',
  'header button:has-text("登录/注册")',
  'nav button:has-text("登录")',
];

/** QR code selectors */
const QR_SELECTORS = [
  '.qrcode-img',
  '.login-qrcode img',
  '.login-qrcode',
  '[class*="qrcode"]',
  'canvas[class*="qr"]',
];

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

  // Check current login status
  const isLoggedIn = await checkLoginStatus(page);
  if (isLoggedIn) {
    debugLog('User already logged in');
    return { success: true, message: 'Already logged in' };
  }

  debugLog('User not logged in, starting auto-login flow...');

  // headless mode: cannot auto-login, return error
  if (headless) {
    debugLog('Headless mode: cannot auto-login, prompting user');
    return {
      success: false,
      message: `Not logged in. Please run: npm run login -- --user ${user}`,
    };
  }

  // GUI mode: auto-start login flow
  return await performAutoLogin(page, { user, timeout });
}

/**
 * Perform automatic login flow (GUI mode only)
 *
 * Steps:
 * 1. Click login button to open modal
 * 2. Switch to QR code tab if needed
 * 3. Wait for user to scan QR code
 * 4. Verify login success
 */
async function performAutoLogin(
  page: Page,
  options: { user: UserName; timeout: number }
): Promise<EnsureLoginResult> {
  const { user, timeout } = options;

  try {
    // Step 1: Click login button
    debugLog('Looking for login button...');
    let loginButtonClicked = false;

    for (const selector of LOGIN_BUTTON_SELECTORS) {
      const button = page.locator(selector).first();
      if (await button.isVisible().catch(() => false)) {
        debugLog('Found login button: ' + selector);
        await humanClick(page, selector);
        loginButtonClicked = true;
        await delay(1000);
        break;
      }
    }

    if (!loginButtonClicked) {
      debugLog('Login button not found, might already be on login page');
    }

    // Step 2: Check for QR code tab and switch if needed
    debugLog('Looking for QR code tab...');
    const qrTab = page.locator(QR_TAB_SELECTOR).first();
    if (await qrTab.isVisible().catch(() => false)) {
      debugLog('Found QR code tab, clicking...');
      await qrTab.click();
      await delay(500);
    }

    // Step 3: Wait for QR code to appear
    debugLog('Waiting for QR code...');
    let qrFound = false;
    let qrPath: string | undefined;

    for (const selector of QR_SELECTORS) {
      const qrElement = page.locator(selector).first();
      if (await qrElement.isVisible().catch(() => false)) {
        debugLog('QR code found: ' + selector);
        qrFound = true;

        // Save QR code for display
        try {
          const buffer = await qrElement.screenshot({ type: 'png' });
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

    if (!qrFound) {
      return {
        success: false,
        message: 'Cannot find QR code. Please login manually.',
      };
    }

    // Step 4: Wait for user to scan QR code
    debugLog('Waiting for user to scan QR code...');

    try {
      await waitForCondition(
        async () => {
          // Check for login success indicators
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
        qrPath,
      };
    }
  } catch (error) {
    debugLog('Auto-login error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

// ============================================
// Export
// ============================================

export default ensureLogin;
