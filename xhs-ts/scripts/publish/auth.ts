/**
 * Authentication utilities for publish flow
 *
 * @module publish/auth
 * @description Handle login detection and wait for creator center login
 */

import type { Page, BrowserContext } from 'playwright';
import type { UserName } from '../user';
import { XhsError, XhsErrorCode } from '../shared';
import { saveCookies } from '../cookie';
import { debugLog } from '../utils/logging';

/**
 * Wait for creator center login with timeout
 *
 * Uses Playwright's native waitForURL for efficient URL monitoring.
 * Optionally saves cookies after successful login.
 *
 * @param page - Playwright page instance
 * @param options - Configuration options
 * @returns true if login successful, false if timeout (when throwOnError is false)
 */
export async function waitForCreatorCenterLogin(
  page: Page,
  options?: {
    /** Timeout in milliseconds (default: 120000) */
    timeout?: number;
    /** Browser context for saving cookies */
    context?: BrowserContext;
    /** User name for cookie storage */
    user?: UserName;
    /** Throw error on timeout instead of returning false */
    throwOnError?: boolean;
  }
): Promise<boolean> {
  const { timeout = 120000, context, user, throwOnError = false } = options || {};

  console.log('\n⚠️  需要登录创作者中心');
  console.log('📱 请在浏览器窗口中登录（扫码或短信验证）');
  console.log('   登录成功后将自动继续...\n');

  try {
    await page.waitForURL(
      (url) => url.href.includes('creator.xiaohongshu.com') && !url.href.includes('login'),
      { timeout }
    );

    console.log('✅ 创作者中心登录成功！\n');
    debugLog('User logged in to creator center');

    // Save cookies if context provided
    if (context) {
      const cookies = await context.cookies();
      await saveCookies(cookies, user);
      debugLog(`Saved ${cookies.length} cookies for user: ${user || 'default'}`);
    }

    return true;
  } catch {
    if (throwOnError) {
      throw new XhsError(
        'Creator center login timeout. Please try again.',
        XhsErrorCode.NOT_LOGGED_IN
      );
    }
    return false;
  }
}

/**
 * Wait for creator center login and save cookies
 *
 * Convenience wrapper that always throws on timeout and saves cookies.
 *
 * @param page - Playwright page instance
 * @param context - Browser context for saving cookies
 * @param timeout - Timeout in milliseconds
 * @param user - User name for cookie storage
 */
export async function requireCreatorCenterLogin(
  page: Page,
  context: BrowserContext,
  timeout = 120000,
  user?: UserName
): Promise<void> {
  await waitForCreatorCenterLogin(page, {
    timeout,
    context,
    user,
    throwOnError: true,
  });
}
