/**
 * Authentication wait utilities
 *
 * @module utils/auth-wait
 * @description Utilities for waiting on login completion during automation flows
 */

import type { Page, BrowserContext } from 'playwright';
import type { UserName } from '../user';
import { waitForCondition } from './helpers';
import { debugLog } from './logging';
import { saveCookies } from '../cookie';

/**
 * Wait for creator center login with timeout
 *
 * @param page - Playwright page instance
 * @param timeout - Timeout in milliseconds (default: 120000)
 * @returns true if login successful, false if timeout
 */
export async function waitForCreatorLogin(page: Page, timeout = 120000): Promise<boolean> {
  try {
    await waitForCondition(
      async () => {
        const url = page.url();
        return url.includes('creator.xiaohongshu.com') && !url.includes('login');
      },
      {
        timeout,
        interval: 2000,
        timeoutMessage: 'Creator center login timeout',
        onProgress: (elapsed) => debugLog(`[${elapsed}s] Waiting for creator center login...`),
        progressInterval: 10000,
      }
    );
    debugLog('User logged in to creator center');
    return true;
  } catch {
    return false;
  }
}

/**
 * Require user to be logged in, throw error if not
 *
 * @param page - Playwright page instance
 * @throws XhsError if not logged in
 */
export async function requireLogin(page: Page): Promise<void> {
  const { checkLoginStatus } = await import('./anti-detect');
  const { XhsError, XhsErrorCode } = await import('../shared');

  const isLoggedIn = await checkLoginStatus(page);
  if (!isLoggedIn) {
    throw new XhsError(
      'Not logged in or session expired. Please run "xhs login" first.',
      XhsErrorCode.NOT_LOGGED_IN
    );
  }
}

/**
 * Save cookies from browser context
 *
 * @param context - Playwright browser context
 * @param user - User name (optional)
 */
export async function saveContextCookies(context: BrowserContext, user?: UserName): Promise<void> {
  const cookies = await context.cookies();
  await saveCookies(cookies, user);
  debugLog(`Saved ${cookies.length} cookies from context for user: ${user || 'default'}`);
}

/**
 * Resolve headless mode with override support
 *
 * @param override - Override value from CLI
 * @param configHeadless - Default value from config
 * @returns resolved headless boolean
 */
export function resolveHeadless(override?: boolean, configHeadless?: boolean): boolean {
  return override ?? configHeadless ?? false;
}
