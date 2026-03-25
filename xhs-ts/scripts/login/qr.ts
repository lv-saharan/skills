/**
 * QR Code login implementation
 *
 * @module login/qr
 * @description QR code authentication flow
 */

import type { Page } from 'playwright';
import { XhsError, XhsErrorCode } from '../shared';
import type { BrowserSession } from '../browser';
import type { UserName } from '../user';
import { saveCookies, extractCookies, hasRequiredCookies } from '../cookie';
import { XHS_URLS, debugLog, delay, randomDelay, waitForCondition } from '../utils/helpers';
import { humanClick, checkCaptcha } from '../utils/anti-detect';
import { outputQrCode } from '../utils/output';
import { getTmpFilePath } from '../config';
import { writeFile } from 'fs/promises';
import type { LoginResult } from './types';

// ============================================
// Constants
// ============================================

/** QR code selectors */
const QR_SELECTORS = [
  '.qrcode-img',
  '.login-qrcode img',
  '.login-qrcode',
  '[class*="qrcode"]',
  'canvas[class*="qr"]',
];

/** Login modal/container selectors */
const LOGIN_MODAL_SELECTORS = [
  '.login-modal',
  '.login-container',
  '.login-content',
  '[class*="loginModal"]',
  '.qrcode-login',
  '.login-wrapper',
];

/** QR code expired patterns */
const QR_EXPIRED_PATTERNS = /二维码.*过期|已失效|请刷新|二维码已失效/;

// ============================================
// QR Code Utilities
// ============================================

/**
 * Capture QR code and save to file (for headless mode)
 */
export async function captureQrCodeToFile(page: Page, user?: UserName): Promise<string> {
  try {
    for (const selector of QR_SELECTORS) {
      const qrElement = page.locator(selector).first();
      if (await qrElement.isVisible().catch(() => false)) {
        const buffer = await qrElement.screenshot({ type: 'png' });
        const filePath = getTmpFilePath('qr_login', 'png', user);
        await writeFile(filePath, buffer);
        debugLog('QR code saved to: ' + filePath);
        return filePath;
      }
    }
    throw new Error('QR code element not found');
  } catch (error) {
    debugLog('Failed to capture QR code:', error);
    throw new XhsError(
      'Failed to capture QR code in headless mode',
      XhsErrorCode.LOGIN_FAILED,
      error
    );
  }
}

/**
 * Check if any element from selector list is visible
 */
async function isAnyVisible(page: Page, selectors: string[]): Promise<boolean> {
  for (const selector of selectors) {
    const isVisible = await page
      .locator(selector)
      .first()
      .isVisible()
      .catch(() => false);
    if (isVisible) {
      return true;
    }
  }
  return false;
}

/**
 * Check for QR code expired message
 */
async function isQrCodeExpired(page: Page): Promise<boolean> {
  return await page
    .locator('text=' + QR_EXPIRED_PATTERNS.source)
    .isVisible()
    .catch(() => false);
}

/**
 * Wait for QR code scan and login completion
 *
 * DETECTION STRATEGY (simple and reliable):
 * Login success = QR code disappeared AND (URL changed OR login modal disappeared)
 *
 * When user scans QR code:
 * 1. QR code disappears from the page
 * 2. Page redirects away from /login
 * 3. Login modal/container disappears
 *
 * Any combination of these indicates successful login.
 */
export async function waitForQrScan(
  page: Page,
  timeout: number,
  browserClosedRef?: { closed: boolean }
): Promise<void> {
  debugLog('Waiting for QR code scan...');
  debugLog('Detection: QR disappeared + (URL changed OR modal disappeared)');

  const startTime = Date.now();
  let loggedQrGone = false;
  let loggedModalGone = false;
  let loggedUrlChanged = false;

  await waitForCondition(
    async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      // Check if browser was closed
      if (browserClosedRef?.closed) {
        throw new XhsError(
          'Browser window closed by user. Login cancelled.',
          XhsErrorCode.LOGIN_FAILED
        );
      }

      // Check for CAPTCHA
      const hasCaptcha = await checkCaptcha(page);
      if (hasCaptcha) {
        throw new XhsError(
          'CAPTCHA detected. Please complete it manually.',
          XhsErrorCode.CAPTCHA_REQUIRED
        );
      }

      // Check for expired QR code
      if (await isQrCodeExpired(page)) {
        throw new XhsError(
          'QR code expired. Please refresh and try again.',
          XhsErrorCode.LOGIN_FAILED
        );
      }

      const currentUrl = page.url();
      const qrVisible = await isAnyVisible(page, QR_SELECTORS);
      const modalVisible = await isAnyVisible(page, LOGIN_MODAL_SELECTORS);

      // Log state changes (only once)
      if (!qrVisible && !loggedQrGone) {
        debugLog('[' + elapsed + 's] QR code disappeared');
        loggedQrGone = true;
      }
      if (!modalVisible && !loggedModalGone) {
        debugLog('[' + elapsed + 's] Login modal disappeared');
        loggedModalGone = true;
      }
      if (!currentUrl.includes('/login') && !loggedUrlChanged) {
        debugLog('[' + elapsed + 's] URL changed to: ' + currentUrl);
        loggedUrlChanged = true;
      }

      // SUCCESS CONDITIONS:
      // QR code must be gone, and either URL changed or modal disappeared
      const qrGone = !qrVisible;
      const urlChanged = !currentUrl.includes('/login');
      const modalGone = !modalVisible;

      if (qrGone && (urlChanged || modalGone)) {
        debugLog('[' + elapsed + 's] Login detected!');
        debugLog('  - QR gone: ' + qrGone);
        debugLog('  - URL changed: ' + urlChanged);
        debugLog('  - Modal gone: ' + modalGone);

        // Wait a moment for page to stabilize
        await delay(1500);

        debugLog('Login successful!');
        return true;
      }

      return false;
    },
    {
      timeout,
      interval: 1000,
      timeoutMessage: 'QR code scan timeout. Please try again.',
      onProgress: (elapsed) => {
        if (elapsed % 10 === 0) {
          debugLog('[' + elapsed + 's] Waiting for QR scan...');
        }
      },
    }
  );
}

// ============================================
// QR Login Flow
// ============================================

/**
 * Perform QR code login
 */
export async function qrLogin(
  instance: BrowserSession,
  timeout: number,
  browserClosedRef: { closed: boolean },
  isHeadless: boolean,
  user?: UserName
): Promise<LoginResult> {
  const { page } = instance;

  // Navigate to login page
  await page.goto(XHS_URLS.login);
  await randomDelay(1000, 2000);

  // Try to find QR code
  let qrFound = false;
  for (const selector of QR_SELECTORS) {
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      debugLog('QR code found with selector: ' + selector);
      qrFound = true;
      break;
    } catch {
      // Try next selector
    }
  }

  if (!qrFound) {
    // Try clicking QR tab
    const qrTabClicked = await humanClick(page, 'text=扫码登录, [class*="qrcode"], [class*="qr-"]');
    if (qrTabClicked) {
      debugLog('Clicked QR tab');
      await delay(2000);
    }
  }

  // Handle headless mode - save QR to file
  if (isHeadless) {
    debugLog('Headless mode: capturing QR code to file');
    const qrPath = await captureQrCodeToFile(page, user);
    outputQrCode(qrPath);
  } else {
    console.error('Please scan the QR code with Xiaohongshu app to login.');
  }

  // Wait for scan and login
  await waitForQrScan(page, timeout, browserClosedRef);

  // Navigate to home page to ensure session is established
  debugLog('Navigating to home page to finalize login...');
  await page.goto(XHS_URLS.home, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
    debugLog('Navigation to home page timed out, continuing...');
  });

  await delay(1000);

  // Extract and save cookies
  const cookies = await extractCookies(instance.context);
  debugLog('Extracted ' + cookies.length + ' cookies from context');

  if (cookies.length === 0) {
    throw new XhsError(
      'Login appeared successful but no cookies were extracted. Please try again.',
      XhsErrorCode.LOGIN_FAILED
    );
  }

  if (!hasRequiredCookies(cookies)) {
    debugLog('Warning: Required cookies (a1, web_session) not found in extracted cookies');
  }

  await saveCookies(cookies, user);

  return {
    success: true,
    message: 'Login successful. Cookies saved.',
    cookieSaved: true,
    user,
  };
}
