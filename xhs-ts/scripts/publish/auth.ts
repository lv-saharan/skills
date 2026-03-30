/**
 * Authentication utilities for publish flow
 *
 * @module publish/auth
 * @description Handle login detection and wait for creator center login
 *
 * @deprecated This module is deprecated in favor of Profile API.
 *   When using `withProfile()` or `launchProfileBrowser()`, cookies are
 *   automatically persisted to the user-data directory.
 *   This module will be removed in a future version.
 */

import type { Page, BrowserContext } from 'playwright';
import type { UserName } from '../user';
import { XhsError, XhsErrorCode } from '../shared';
import { debugLog } from '../utils/logging';

/**
 * Wait for creator center login with timeout
 *
 * @deprecated Use Profile API instead. Cookies are auto-persisted.
 *
 * Uses Playwright's native waitForURL for efficient URL monitoring.
 * Note: When using Profile API, cookies are automatically persisted.
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
    /** Browser context (kept for API compatibility, cookies auto-persist in Profile mode) */
    context?: BrowserContext;
    /** User name (kept for API compatibility) */
    user?: UserName;
    /** Throw error on timeout instead of returning false */
    throwOnError?: boolean;
  }
): Promise<boolean> {
  const { timeout = 120000, throwOnError = false } = options || {};

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

    // Note: In Profile mode, cookies are auto-persisted by Playwright
    // No need to manually save cookies

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
 * Wait for creator center login
 *
 * @deprecated Use Profile API instead. Cookies are auto-persisted.
 *
 * Convenience wrapper that always throws on timeout.
 *
 * @param page - Playwright page instance
 * @param context - Browser context (kept for API compatibility)
 * @param timeout - Timeout in milliseconds
 * @param user - User name (kept for API compatibility)
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
