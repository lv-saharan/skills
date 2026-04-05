/**
 * QR Code login implementation
 *
 * @module login/qr
 * @description QR code authentication flow
 */

import type { Page } from 'playwright';
import { SkillError, SkillErrorCode, urls } from '../../config';
import { getTmpFilePath } from '../../core/utils';
import { QR_SELECTORS, LOGIN_MODAL_SELECTORS, LOGIN_BUTTON_SELECTORS } from './selectors';
import type { BrowserInstance } from '../../core/browser/types';
import type { UserName } from '../../user';
import { debugLog, delay, randomDelay, waitForCondition } from '../../core/utils';
import { humanClick, checkCaptcha } from '../../core/anti-detect';
import { checkErrorPage } from '../shared/session';
import { outputQrCode } from '../../core/utils/output';
import { writeFile } from 'fs/promises';
import type { LoginResult } from './types';

// ============================================
// Constants
// ============================================

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
    throw new SkillError(
      'Failed to capture QR code in headless mode',
      SkillErrorCode.LOGIN_FAILED,
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

      if (page.isClosed()) {
        throw new SkillError(
          'Browser window closed by user. Login cancelled.',
          SkillErrorCode.LOGIN_FAILED
        );
      }

      const hasCaptcha = await checkCaptcha(page);
      if (hasCaptcha) {
        throw new SkillError(
          'CAPTCHA detected. Please complete it manually.',
          SkillErrorCode.CAPTCHA_REQUIRED
        );
      }

      if (await isQrCodeExpired(page)) {
        throw new SkillError(
          'QR code expired. Please refresh and try again.',
          SkillErrorCode.LOGIN_FAILED
        );
      }

      const currentUrl = page.url();
      const qrVisible = await isAnyVisible(page, QR_SELECTORS);
      const modalVisible = await isAnyVisible(page, LOGIN_MODAL_SELECTORS);

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

      const qrGone = !qrVisible;
      const urlChanged = !currentUrl.includes('/login');
      const modalGone = !modalVisible;

      if (qrGone && (urlChanged || modalGone)) {
        debugLog('[' + elapsed + 's] Login detected!');
        debugLog('  - QR gone: ' + qrGone);
        debugLog('  - URL changed: ' + urlChanged);
        debugLog('  - Modal gone: ' + modalGone);

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
 */
async function triggerLoginModal(page: Page): Promise<void> {
  debugLog('Navigating to home page...');
  await page.goto(urls.home, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay(2000, 3000);

  const errorResult = await checkErrorPage(page);
  if (errorResult.isError) {
    throw new SkillError(
      `登录失败：检测到错误页面 (错误码: ${errorResult.errorCode || '未知'}, 原因: ${errorResult.errorMsg || '未知'})。` +
        `建议：1) 切换网络环境后重试；2) 使用代理；3) 使用非 headless 模式登录。`,
      SkillErrorCode.LOGIN_FAILED
    );
  }

  const modalVisible = await isAnyVisible(page, LOGIN_MODAL_SELECTORS);
  if (modalVisible) {
    debugLog('Login modal already visible (auto-popup)');
    return;
  }

  const qrVisible = await isAnyVisible(page, QR_SELECTORS);
  if (qrVisible) {
    debugLog('QR code already visible (redirected to login)');
    return;
  }

  debugLog('Clicking login button to trigger login modal...');
  for (const selector of LOGIN_BUTTON_SELECTORS) {
    const clicked = await humanClick(page, selector);
    if (clicked) {
      debugLog('Clicked login button: ' + selector);
      await delay(2000);
      return;
    }
  }

  debugLog('No login button found, navigating to login page...');
  await page.goto(urls.login, { waitUntil: 'domcontentloaded', timeout: 30000 });
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

  await triggerLoginModal(page);

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
    const qrTabClicked = await humanClick(page, 'text=扫码登录, [class*="qrcode"], [class*="qr-"]');
    if (qrTabClicked) {
      debugLog('Clicked QR tab');
      await delay(2000);
    }
  }

  if (isHeadless) {
    debugLog('Headless mode: capturing QR code to file');
    const qrPath = await captureQrCodeToFile(page, user);
    outputQrCode(qrPath, '请扫描二维码登录');
  } else {
    console.error('Please scan the QR code with Xiaohongshu app to login.');
  }

  await waitForQrScan(page, timeout);

  debugLog('Navigating to home page to finalize login...');
  await page.goto(urls.home, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {
    debugLog('Navigation to home page timed out, continuing...');
  });

  await delay(1000);

  debugLog('Login successful. Session will auto-persist to profile.');

  return {
    success: true,
    message: 'Login successful. Session persisted to profile.',
    cookieSaved: true,
    user,
  };
}
