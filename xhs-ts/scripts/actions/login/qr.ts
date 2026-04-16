/**
 * QR Code login implementation
 *
 * @module login/qr
 * @description QR code authentication flow
 */

import type { Page } from 'playwright';
import { SkillError, SkillErrorCode, urls, timeouts } from '../../config';
import { getTmpFilePath } from '../../core/utils';
import { QR_SELECTORS } from './selectors';
import { LOGIN_MODAL_SELECTOR, LOGIN_BUTTON_SELECTORS } from '../shared/selectors';
import type { BrowserInstance } from '../../core/browser/types';
import type { UserName } from '../../user';
import { debugLog, delay, randomDelay, waitForCondition } from '../../core/utils';
import { humanClick, checkCaptcha } from '../../core/anti-detect';
import { isLoggedIn } from '../auth/status';
import { checkErrorPage } from '../auth';
import { outputQrCode, outputCaptcha } from '../../core/utils/output';
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
async function captureQrCodeToFile(page: Page, user?: UserName): Promise<string> {
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
 *
 * Detection logic (robust against page refresh):
 * - QR code element disappears AND login modal disappears
 * - Then verify with isLoggedIn() to confirm actual login
 *
 * NOTE: Xiaohongshu may refresh the page 1-2 times after QR scan.
 * We use waitForCondition with proper element checks instead of page.isClosed()
 * to avoid false positives during page refresh.
 */
export async function waitForQrScan(page: Page, timeout: number, user?: UserName): Promise<void> {
  debugLog('Waiting for QR code scan...');
  debugLog('Detection: QR + modal disappeared, then verify login status');

  const startTime = Date.now();
  let loggedQrGone = false;
  let loggedModalGone = false;
  let loggedCaptcha = false;
  let captchaDetectedAt: number | null = null;
  const captchaTimeout = timeouts.captcha ?? 60000;

  await waitForCondition(
    async () => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);

      // Early exit: browser closed by user
      if (page.isClosed()) {
        throw new SkillError(
          'Browser window closed by user. Login cancelled.',
          SkillErrorCode.LOGIN_FAILED
        );
      }

      // Check for QR expired
      if (await isQrCodeExpired(page)) {
        throw new SkillError(
          'QR code expired. Please refresh and try again.',
          SkillErrorCode.LOGIN_FAILED
        );
      }

      // Check for CAPTCHA
      const hasCaptcha = await checkCaptcha(page);
      if (hasCaptcha) {
        if (!loggedCaptcha) {
          debugLog('[' + elapsed + 's] CAPTCHA detected, capturing screenshot...');
          captchaDetectedAt = Date.now();
          const captchaPath = getTmpFilePath('captcha', 'png', user);
          await page.screenshot({ path: captchaPath, fullPage: false });
          debugLog('CAPTCHA screenshot saved to: ' + captchaPath);
          outputCaptcha(captchaPath, '检测到验证码，请手动完成');
          loggedCaptcha = true;
        }

        // Check if captcha timeout exceeded
        const captchaElapsed = Math.floor((Date.now() - (captchaDetectedAt ?? Date.now())) / 1000);
        if (captchaElapsed * 1000 >= captchaTimeout) {
          throw new SkillError(
            '验证码处理超时（' + Math.floor(captchaTimeout / 1000) + '秒），请重试。',
            SkillErrorCode.CAPTCHA_REQUIRED
          );
        }
      }

      const qrVisible = await isAnyVisible(page, QR_SELECTORS);
      const modalVisible = await page
        .locator(LOGIN_MODAL_SELECTOR)
        .first()
        .isVisible()
        .catch(() => false);

      if (!qrVisible && !loggedQrGone) {
        debugLog('[' + elapsed + 's] QR code disappeared');
        loggedQrGone = true;
      }
      if (!modalVisible && !loggedModalGone) {
        debugLog('[' + elapsed + 's] Login modal disappeared');
        loggedModalGone = true;
      }

      // Login detected: both QR and modal are gone
      if (!qrVisible && !modalVisible) {
        debugLog('[' + elapsed + 's] Login UI cleared, verifying login status...');

        // Wait for page to stabilize (handle auto-refresh)
        await page.waitForLoadState('domcontentloaded', { timeout: 10000 }).catch(() => {});
        await delay(2000);

        // CRITICAL: Verify actual login status, not just URL change
        const loggedIn = await isLoggedIn(page);
        if (loggedIn) {
          debugLog('[' + elapsed + 's] Login verified successfully!');
          return true;
        }

        debugLog('[' + elapsed + 's] Login status not confirmed yet, continuing to wait...');
        // Reset flags so we keep checking
        loggedQrGone = false;
        loggedModalGone = false;
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
export async function triggerLoginModal(page: Page): Promise<void> {
  debugLog('Navigating to home page...');
  await page.goto(urls.home, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await randomDelay(2000, 3000);

  const errorResult = await checkErrorPage(page);
  if (errorResult.isError) {
    throw new SkillError(
      `登录失败：检测到错误页面 (错误码: ${errorResult.errorCode || '未知'}, 原因: ${errorResult.errorMsg || '未知'})。` +
        `建议：1) 切换网络环境后重试；2) 使用代理；3) 检查是否被风控。`,
      SkillErrorCode.LOGIN_FAILED
    );
  }

  const modalVisible = await page
    .locator(LOGIN_MODAL_SELECTOR)
    .first()
    .isVisible()
    .catch(() => false);
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

  await waitForQrScan(page, timeout, user);

  // CRITICAL: Final login verification before returning success
  debugLog('Final login verification...');
  const loggedIn = await isLoggedIn(page);
  if (!loggedIn) {
    throw new SkillError(
      'Login verification failed. QR scan may not have completed successfully.',
      SkillErrorCode.LOGIN_FAILED
    );
  }

  debugLog('Login verified. Navigating to home page...');
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
