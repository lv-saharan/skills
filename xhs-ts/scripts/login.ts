/**
 * Login command implementation
 *
 * @module login
 * @description Handle user authentication via QR code or SMS
 */

import type { Page } from 'playwright';
import type { LoginOptions, LoginResult } from './types';
import { XhsErrorCode } from './types';
import { XhsError } from './types';
import { createBrowserInstance, closeBrowserInstance, type BrowserInstance } from './browser';
import { saveCookies, extractCookies } from './cookie';
import { XHS_URLS, config, debugLog, delay, randomDelay } from './utils/helpers';
import { humanClick, checkCaptcha, checkLoginStatus } from './utils/anti-detect';
import { outputSuccess, outputFromError, outputQrCode } from './utils/output';

// ============================================
// Constants
// ============================================

const LOGIN_TIMEOUT = 120000; // 2 minutes
const QR_CHECK_INTERVAL = 1000; // 1 second

// ============================================
// QR Code Login
// ============================================

/**
 * Wait for QR code scan and login completion
 */
async function waitForQrScan(
  page: Page,
  timeout: number = LOGIN_TIMEOUT,
  browserClosedRef?: { closed: boolean }
): Promise<boolean> {
  const startTime = Date.now();

  debugLog('Waiting for QR code scan...');

  while (Date.now() - startTime < timeout) {
    // Check if browser was closed by user
    if (browserClosedRef?.closed) {
      throw new XhsError(
        'Browser window closed by user. Login cancelled.',
        XhsErrorCode.LOGIN_FAILED
      );
    }
    // Check if redirected away from login page (strongest indicator)
    const currentUrl = page.url();
    if (!currentUrl.includes('/login') && currentUrl.includes('xiaohongshu.com')) {
      debugLog('Redirected from login page, checking login status...');

      // Wait a moment for page to stabilize
      await delay(2000);

      // Double check with login status
      const isLoggedIn = await checkLoginStatus(page);
      if (isLoggedIn) {
        debugLog('Login successful via QR code');
        return true;
      }
    }

    // Check for captcha
    const hasCaptcha = await checkCaptcha(page);
    if (hasCaptcha) {
      throw new XhsError(
        'CAPTCHA detected. Please complete it manually.',
        XhsErrorCode.CAPTCHA_REQUIRED
      );
    }

    // Check for QR code expired
    const qrExpired = await page
      .locator('text=/二维码.*过期|已失效|请刷新/')
      .isVisible()
      .catch(() => false);
    if (qrExpired) {
      throw new XhsError(
        'QR code expired. Please refresh and try again.',
        XhsErrorCode.LOGIN_FAILED
      );
    }

    await delay(QR_CHECK_INTERVAL);
  }

  throw new XhsError('QR code scan timeout. Please try again.', XhsErrorCode.LOGIN_FAILED);
}

/**
 * Capture QR code as base64 data URL
 */
async function captureQrCodeDataUrl(page: Page, qrSelector: string): Promise<string> {
  try {
    const qrElement = page.locator(qrSelector).first();
    const buffer = await qrElement.screenshot({ type: 'png' });
    const base64 = buffer.toString('base64');
    return `data:image/png;base64,${base64}`;
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
 * Perform QR code login
 */
async function qrLogin(
  instance: BrowserInstance,
  timeout: number,
  browserClosedRef: { closed: boolean },
  isHeadless: boolean
): Promise<LoginResult> {
  const { page } = instance;

  // Navigate to login page
  await page.goto(XHS_URLS.login);
  await randomDelay(1000, 2000);

  // Wait for QR code to appear
  const qrSelector = '.qrcode-img, .login-qrcode img, canvas';
  try {
    await page.waitForSelector(qrSelector, { timeout: 10000 });
    debugLog('QR code displayed');
  } catch {
    // QR code might not be the default, try clicking QR tab
    const qrTabClicked = await humanClick(page, 'text=扫码登录, [class*="qrcode"], [class*="qr-"]');
    if (!qrTabClicked) {
      throw new XhsError('Cannot find QR code on login page', XhsErrorCode.LOGIN_FAILED);
    }
    await delay(2000);
  }

  // Handle headless mode: output QR code as JSON for OpenClaw
  if (isHeadless) {
    debugLog('Headless mode: capturing QR code for output');
    const qrDataUrl = await captureQrCodeDataUrl(page, qrSelector);
    outputQrCode(qrDataUrl, '请使用小红书 App 扫描二维码登录');
  } else {
    // Headed mode: print instruction for user
    console.error('Please scan the QR code with Xiaohongshu app to login.');
  }

  // Wait for scan
  await waitForQrScan(page, timeout, browserClosedRef);

  // Extract and save cookies
  const cookies = await extractCookies(instance.context);
  await saveCookies(cookies);

  return {
    success: true,
    message: 'Login successful. Cookies saved.',
    cookieSaved: true,
  };
}

// ============================================
// SMS Login
// ============================================

/**
 * Perform SMS login (interactive)
 */
async function smsLogin(
  instance: BrowserInstance,
  timeout: number,
  browserClosedRef: { closed: boolean }
): Promise<LoginResult> {
  const { page } = instance;

  // Navigate to login page
  await page.goto(XHS_URLS.login);
  await randomDelay(1000, 2000);

  // Click SMS login tab
  const smsTabClicked = await humanClick(page, 'text=手机登录, text=短信登录, [class*="sms"]');
  if (!smsTabClicked) {
    throw new XhsError('Cannot find SMS login option', XhsErrorCode.LOGIN_FAILED);
  }

  await delay(1000);

  // Print instruction
  console.error('Please complete SMS login in the browser window.');

  // Wait for login completion
  const startTime = Date.now();
  while (Date.now() - startTime < timeout) {
    // Check if browser was closed by user
    if (browserClosedRef?.closed) {
      throw new XhsError(
        'Browser window closed by user. Login cancelled.',
        XhsErrorCode.LOGIN_FAILED
      );
    }

    // Check if redirected away from login page
    const currentUrl = page.url();
    if (!currentUrl.includes('/login') && currentUrl.includes('xiaohongshu.com')) {
      debugLog('Redirected from login page, checking login status...');

      // Wait a moment for page to stabilize
      await delay(2000);

      const isLoggedIn = await checkLoginStatus(page);
      if (isLoggedIn) {
        debugLog('Login successful via SMS');

        // Extract and save cookies
        const cookies = await extractCookies(instance.context);
        await saveCookies(cookies);

        return {
          success: true,
          message: 'Login successful. Cookies saved.',
          cookieSaved: true,
        };
      }
    }

    await delay(1000);
  }

  throw new XhsError('SMS login timeout. Please try again.', XhsErrorCode.LOGIN_FAILED);
}

// ============================================
// Main Login Function
// ============================================

/**
 * Execute login command
 */
export async function executeLogin(options: LoginOptions = { method: 'qr' }): Promise<void> {
  const { method, headless, timeout = LOGIN_TIMEOUT } = options;

  debugLog(`Starting ${method} login...`);

  // Determine actual headless mode (default to false for login to allow user interaction)
  const isHeadless = headless ?? false;

  let instance: BrowserInstance | null = null;

  try {
    // Create browser instance
    instance = await createBrowserInstance({
      headless: isHeadless,
    });

    // Track browser close state for headed mode (only needed when browser is visible)
    // When user closes the browser window, browser.on('disconnected') fires
    const browserClosedRef = { closed: false };
    if (!isHeadless) {
      instance.browser.on('disconnected', () => {
        debugLog('Browser disconnected (window closed by user)');
        browserClosedRef.closed = true;
      });
    }

    // Execute login based on method
    let result: LoginResult;

    switch (method) {
      case 'sms':
        result = await smsLogin(instance, timeout, browserClosedRef);
        break;
      case 'qr':
      default:
        result = await qrLogin(instance, timeout, browserClosedRef, isHeadless);
        break;
    }

    outputSuccess(result);
  } catch (error) {
    outputFromError(error);
    process.exit(1);
  } finally {
    await closeBrowserInstance(instance);
  }
}

// ============================================
// Login Status Check
// ============================================

/**
 * Check if current cookies are valid for login
 */
export async function checkLogin(): Promise<boolean> {
  const { loadCookies, hasRequiredCookies } = await import('./cookie');
  const cookies = await loadCookies();
  return hasRequiredCookies(cookies);
}
