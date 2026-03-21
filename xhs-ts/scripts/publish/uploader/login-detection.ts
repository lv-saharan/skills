/**
 * Login detection for upload
 *
 * @module publish/uploader/login-detection
 * @description Detect login state and handle login during upload
 */

import type { Page } from 'playwright';
import { XhsError, XhsErrorCode } from '../../shared';
import { TIMEOUTS } from '../../shared';
import { delay, debugLog } from '../../utils/helpers';

/**
 * Check if we're on the login page
 * Returns an object with result and reason for debugging
 */
export async function isOnLoginPage(page: Page): Promise<{ isLogin: boolean; reason?: string }> {
  // First check URL - most reliable indicator
  const url = page.url();

  // If on creator center domain, check for specific login URL
  if (url.includes('creator.xiaohongshu.com')) {
    // Creator center has its own login flow
    if (url.includes('/login') || url.includes('/signin')) {
      return { isLogin: true, reason: `Creator center login URL: ${url}` };
    }
    // If on publish page or other creator pages, NOT on login page
    // Even if there are login-related elements, they're just prompts, not actual login page
    return { isLogin: false };
  }

  // For main site, check URL first
  if (url.includes('login') || url.includes('signin') || url.includes('auth')) {
    return { isLogin: true, reason: `URL contains login/signin/auth: ${url}` };
  }

  // Check for definitive login page elements (only if not on creator center)
  // These selectors are specific to actual login forms, not just login prompts
  const strongIndicators = [
    { selector: 'input[placeholder*="手机号"]', name: 'phone input' },
    { selector: 'input[placeholder*="phone"]', name: 'phone input (en)' },
    { selector: '.login-container', name: 'login container class' },
    { selector: '[class*="login-page"]', name: 'login-page class' },
    { selector: '[class*="LoginModal"]', name: 'LoginModal class' },
  ];

  for (const indicator of strongIndicators) {
    const isVisible = await page
      .locator(indicator.selector)
      .isVisible()
      .catch(() => false);
    if (isVisible) {
      return { isLogin: true, reason: `Found ${indicator.name}` };
    }
  }

  // Check for login buttons - but only if they're prominent (not just text links)
  // "发送验证码" and "获取验证码" buttons indicate an active login form
  const sendCodeBtn = await page
    .locator('button:has-text("发送验证码"), button:has-text("获取验证码")')
    .isVisible()
    .catch(() => false);
  if (sendCodeBtn) {
    return { isLogin: true, reason: 'Found send SMS code button' };
  }

  // Check for QR code login (common on Xiaohongshu)
  const hasQRCode = await page
    .locator('img[src*="qr"], [class*="qr-code"], [class*="qrcode"]')
    .isVisible()
    .catch(() => false);

  if (hasQRCode) {
    // Additional check: is this QR for login?
    const hasLoginText = await page
      .locator('text=/登录|login/i')
      .isVisible()
      .catch(() => false);
    if (hasLoginText) {
      return { isLogin: true, reason: 'QR code with login text' };
    }
  }

  return { isLogin: false };
}

/**
 * Wait for user to complete login after session loss
 */
export async function waitForUserLogin(page: Page): Promise<void> {
  debugLog('Session lost during upload. Waiting for user to log in manually...');
  console.log('\n⚠️  Session expired or security check triggered.');
  console.log('📱 Please log in using the browser window (QR code or SMS).\n');

  const startTime = Date.now();
  const LOGIN_TIMEOUT = TIMEOUTS.LOGIN; // 2 minutes

  while (Date.now() - startTime < LOGIN_TIMEOUT) {
    const elapsed = Math.floor((Date.now() - startTime) / 1000);

    // Check if we're back on the publish page
    const url = page.url();
    if (url.includes('creator.xiaohongshu.com/publish')) {
      // Check for editor elements
      const hasEditor = await page
        .locator('button:has-text("上传图片")')
        .isVisible()
        .catch(() => false);
      if (hasEditor) {
        debugLog('User logged in successfully, back to publish page');
        console.log('✅ Login successful! Continuing with publish...\n');
        return;
      }
    }

    // Log status every 10 seconds
    if (elapsed % 10 === 0 && elapsed > 0) {
      debugLog(`[${elapsed}s] Waiting for user login...`);
    }

    await delay(1000);
  }

  throw new XhsError(
    'Login timeout. Please try again with fresh cookies.',
    XhsErrorCode.NOT_LOGGED_IN
  );
}
