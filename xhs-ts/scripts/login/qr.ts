/**
 * QR Code login implementation
 *
 * @module login/qr
 * @description QR code authentication flow
 */

import type { Page } from 'playwright';
import { XhsError, XhsErrorCode } from '../shared';
import type { BrowserInstance } from '../browser';
import type { UserName } from '../user';
import { XHS_URLS, debugLog, delay, randomDelay, waitForCondition } from '../utils/helpers';
import { humanClick, checkCaptcha, checkErrorPage } from '../utils/anti-detect';
import { outputQrCode } from '../utils/output';
import { getTmpFilePath } from '../config';
import { writeFile } from 'fs/promises';
import type { LoginResult } from './types';

// ============================================
// Constants
// ============================================

/** QR code selectors */
const QR_SELECTORS: string[] = ['img.qrcode-img'];

/** Login modal/container selectors */
const LOGIN_MODAL_SELECTORS: string[] = ['.login-container'];

/** Login button selectors (to trigger login from home page) */
const LOGIN_BUTTON_SELECTORS: string[] = ['button.login-btn', '.login-btn'];

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
export async function waitForQrScan(page: Page, timeout: number): Promise<void> {
  debugLog('Waiting for QR code scan...');
  debugLog('Detection: QR disappeared + (URL changed OR modal disappeared)');

  const startTime = Date.now();
  let loggedQrGone = false;
  let loggedModalGone = false;
  let loggedUrlChanged = false;

  await waitForCondition(
    async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      // Check if page/browser was closed by user
      if (page.isClosed()) {
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
 * Trigger login modal from home page
 *
 * Strategy: Start from home page for natural behavior
 * 1. Navigate to home page
 * 2. Check for error page (IP risk, etc.)
 * 3. Wait for page to load
 * 4. Check if login modal already visible (auto-popup)
 * 5. If not, click login button to trigger login modal
 */
async function triggerLoginModal(page: Page): Promise<void> {
  debugLog('Navigating to home page...');
  await page.goto(XHS_URLS.home, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay(2000, 3000);

  // STEP 1: 检查是否为错误页面（IP风险等）
  const errorResult = await checkErrorPage(page);
  if (errorResult.isError) {
    throw new XhsError(
      `登录失败：检测到错误页面 (错误码: ${errorResult.errorCode || '未知'}, 原因: ${errorResult.errorMsg || '未知'})。` +
        `建议：1) 切换网络环境后重试；2) 使用代理；3) 使用非 headless 模式登录。`,
      XhsErrorCode.LOGIN_FAILED
    );
  }

  // STEP 2: 检查登录弹窗是否已经显示（自动弹出）
  const modalVisible = await isAnyVisible(page, LOGIN_MODAL_SELECTORS);
  if (modalVisible) {
    debugLog('Login modal already visible (auto-popup)');
    return;
  }

  // STEP 3: 检查 QR 码是否已经显示（直接跳转到登录页）
  const qrVisible = await isAnyVisible(page, QR_SELECTORS);
  if (qrVisible) {
    debugLog('QR code already visible (redirected to login)');
    return;
  }

  // STEP 4: 点击登录按钮触发登录弹窗
  debugLog('Clicking login button to trigger login modal...');
  for (const selector of LOGIN_BUTTON_SELECTORS) {
    const clicked = await humanClick(page, selector);
    if (clicked) {
      debugLog('Clicked login button: ' + selector);
      await delay(2000);
      return;
    }
  }

  // Fallback: 直接导航到登录页
  debugLog('No login button found, navigating to login page...');
  await page.goto(XHS_URLS.login, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay(1000, 2000);
}

/**
 * Perform QR code login
 */
export async function qrLogin(
  instance: BrowserInstance,
  timeout: number,
  isHeadless: boolean,
  user?: UserName
): Promise<LoginResult> {
  const { page } = instance;

  // Start from home page (natural behavior)
  await triggerLoginModal(page);

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
  await waitForQrScan(page, timeout);

  // Navigate to home page to ensure session is established
  debugLog('Navigating to home page to finalize login...');
  await page.goto(XHS_URLS.home, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
    debugLog('Navigation to home page timed out, continuing...');
  });

  await delay(1000);

  // Profile auto-persists cookies to user-data/ directory
  debugLog('Login successful. Session will auto-persist to profile.');

  return {
    success: true,
    message: 'Login successful. Session persisted to profile.',
    cookieSaved: true,
    user,
  };
}
