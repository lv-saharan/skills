/**
 * QR Code login implementation
 *
 * @module login/qr
 * @description QR code authentication flow
 */

import type { Page } from 'playwright';
import { XhsError, XhsErrorCode } from '../shared';
import type { BrowserInstance } from '../browser';
import { saveCookies, extractCookies } from '../cookie';
import { XHS_URLS, debugLog, delay, randomDelay, waitForCondition } from '../utils/helpers';
import { humanClick, checkCaptcha, checkLoginStatus } from '../utils/anti-detect';
import { outputQrCode } from '../utils/output';
import { getTmpFilePath } from '../config';
import { writeFile } from 'fs/promises';
import type { LoginResult } from './types';

// ============================================
// Constants
// ============================================

const QR_SELECTOR = '.qrcode-img, .login-qrcode img, canvas';
const QR_EXPIRED_PATTERNS = /二维码.*过期|已失效|请刷新/;

// ============================================
// QR Code Utilities
// ============================================

/**
 * Capture QR code and save to file (for headless mode)
 */
export async function captureQrCodeToFile(page: Page): Promise<string> {
  try {
    const qrElement = page.locator(QR_SELECTOR).first();
    const buffer = await qrElement.screenshot({ type: 'png' });
    const filePath = getTmpFilePath('qr_login', 'png');
    await writeFile(filePath, buffer);
    debugLog(`QR code saved to: ${filePath}`);
    return filePath;
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
 * Wait for QR code scan and login completion
 */
export async function waitForQrScan(
  page: Page,
  timeout: number,
  browserClosedRef?: { closed: boolean }
): Promise<void> {
  debugLog('Waiting for QR code scan...');

  await waitForCondition(
    async () => {
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
      const qrExpired = await page
        .locator(`text=${QR_EXPIRED_PATTERNS.source}`)
        .isVisible()
        .catch(() => false);
      if (qrExpired) {
        throw new XhsError(
          'QR code expired. Please refresh and try again.',
          XhsErrorCode.LOGIN_FAILED
        );
      }

      // Check if redirected from login page
      const currentUrl = page.url();
      if (!currentUrl.includes('/login') && currentUrl.includes('xiaohongshu.com')) {
        debugLog('Redirected from login page, checking login status...');
        await delay(2000);
        const isLoggedIn = await checkLoginStatus(page);
        if (isLoggedIn) {
          debugLog('Login successful via QR code');
          return true;
        }
      }

      return false;
    },
    {
      timeout,
      interval: 1000,
      timeoutMessage: 'QR code scan timeout. Please try again.',
      onProgress: (elapsed) => debugLog(`[${elapsed}s] Waiting for QR scan...`),
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
  instance: BrowserInstance,
  timeout: number,
  browserClosedRef: { closed: boolean },
  isHeadless: boolean
): Promise<LoginResult> {
  const { page } = instance;

  await page.goto(XHS_URLS.login);
  await randomDelay(1000, 2000);

  // Try to find QR code
  try {
    await page.waitForSelector(QR_SELECTOR, { timeout: 10000 });
    debugLog('QR code displayed');
  } catch {
    const qrTabClicked = await humanClick(page, 'text=扫码登录, [class*="qrcode"], [class*="qr-"]');
    if (!qrTabClicked) {
      throw new XhsError('Cannot find QR code on login page', XhsErrorCode.LOGIN_FAILED);
    }
    await delay(2000);
  }

  // Handle headless mode
  if (isHeadless) {
    debugLog('Headless mode: capturing QR code to file');
    const qrPath = await captureQrCodeToFile(page);
    outputQrCode(qrPath);
  } else {
    console.error('Please scan the QR code with Xiaohongshu app to login.');
  }

  // Wait for scan
  await waitForQrScan(page, timeout, browserClosedRef);

  // Save cookies
  const cookies = await extractCookies(instance.context);
  await saveCookies(cookies);

  return {
    success: true,
    message: 'Login successful. Cookies saved.',
    cookieSaved: true,
  };
}
