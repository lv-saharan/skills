/**
 * Authentication wait utilities
 *
 * @module utils/auth-wait
 * @description Utilities for waiting on login completion during automation flows
 */

import type { Page, BrowserContext } from 'playwright';
import { delay } from './helpers';
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
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    await delay(2000);
    const url = page.url();

    if (url.includes('creator.xiaohongshu.com') && !url.includes('login')) {
      debugLog('User logged in to creator center');
      return true;
    }

    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    if (elapsed % 10 === 0 && elapsed > 0) {
      debugLog(`[${elapsed}s] Waiting for creator center login...`);
    }
  }

  return false;
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
 */
export async function saveContextCookies(context: BrowserContext): Promise<void> {
  const cookies = await context.cookies();
  await saveCookies(cookies);
  debugLog(`Saved ${cookies.length} cookies from context`);
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
