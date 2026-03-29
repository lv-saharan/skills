/**
 * Interact module shared utilities
 *
 * @module interact/shared
 * @description Common utilities for interaction operations (like, collect, comment, follow)
 */

import type { Page } from 'playwright';
import type { UserName } from '../user';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { XhsError, XhsErrorCode, TIMEOUTS } from '../shared';
import { XHS_URLS, delay, gaussianDelay } from '../utils/helpers';
import { checkLoginStatus, checkCaptcha, simulateReading } from '../utils/anti-detect';

// ============================================
// Constants
// ============================================

/** Page load timeout for interaction operations */
export const INTERACTION_PAGE_LOAD_TIMEOUT = 20000;

/** Delay constants for interaction operations */
export const INTERACTION_DELAYS = {
  /** Delay after page navigation */
  afterNavigation: { mean: 2000, stdDev: 400 },
  /** Delay after click action */
  afterClick: { mean: 1200, stdDev: 300 },
  /** Default batch operation interval */
  batchInterval: { mean: 3000, stdDev: 800 },
} as const;

// ============================================
// Session Utilities
// ============================================

/**
 * Execute an action with authenticated session
 *
 * This function handles:
 * 1. Loading and validating cookies
 * 2. Navigating to homepage to verify login
 * 3. Checking login status
 * 4. Executing the provided callback
 *
 * @param headless - Headless mode override
 * @param user - User name for multi-user support
 * @param callback - Function to execute with authenticated page
 * @returns Result of the callback
 */
export async function withAuthenticatedAction<T>(
  headless: boolean | undefined,
  user: UserName | undefined,
  callback: (page: Page) => Promise<T>
): Promise<T> {
  return withSession(
    async (session) => {
      // 1. Load and validate cookies
      const cookies = await loadCookies(user);
      validateCookies(cookies);
      await session.context.addCookies(cookies);

      // 2. Navigate to homepage to establish session
      await session.page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
      await delay(3000);

      // 3. Verify login status
      if (!(await checkLoginStatus(session.page))) {
        throw new XhsError('未登录，请先执行 "xhs login"', XhsErrorCode.NOT_LOGGED_IN);
      }

      // 4. Execute the callback with authenticated page
      return callback(session.page);
    },
    { headless: headless ?? false }
  );
}

// ============================================
// Page Utilities
// ============================================

/**
 * Navigate to a page and wait for load
 */
export async function navigateToPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
  await page
    .waitForLoadState('networkidle', { timeout: INTERACTION_PAGE_LOAD_TIMEOUT })
    .catch(() => {});
  await gaussianDelay(INTERACTION_DELAYS.afterNavigation);
}

/**
 * Check common error states on a page
 *
 * @returns Error message if page has error, null otherwise
 */
export async function checkPageErrors(page: Page): Promise<string | null> {
  // Check login status
  if (!(await checkLoginStatus(page))) {
    return '需要登录';
  }

  // Check for captcha
  if (await checkCaptcha(page)) {
    return '检测到验证码';
  }

  // Check for page errors
  const pageContent = await page.content();
  if (pageContent.includes('当前笔记暂时无法浏览') || pageContent.includes('页面不见了')) {
    return '页面不可访问';
  }
  if (pageContent.includes('用户不存在')) {
    return '用户不存在';
  }

  return null;
}

/**
 * Perform pre-action checks and setup
 *
 * 1. Navigate to page
 * 2. Check for errors
 * 3. Simulate human reading
 *
 * @returns Error message if checks fail, null if successful
 */
export async function preparePageForAction(page: Page, url: string): Promise<string | null> {
  // Navigate
  await navigateToPage(page, url);

  // Check errors
  const error = await checkPageErrors(page);
  if (error) {
    return error;
  }

  // Simulate reading
  await simulateReading(page);

  return null;
}

// ============================================
// Batch Operation Utilities
// ============================================

/**
 * Execute batch operations with delay
 *
 * @param items - Items to process
 * @param processItem - Function to process each item
 * @param options - Batch options
 */
export async function executeBatch<T, R>(
  items: T[],
  processItem: (item: T, index: number) => Promise<R>,
  options: {
    /** Optional delay between items (ms). If not provided, uses Gaussian default. */
    delayBetween?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { onProgress } = options;
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    const result = await processItem(items[i], i);
    results.push(result);

    if (onProgress) {
      onProgress(i + 1, items.length);
    }

    // Delay between items (not after last one)
    if (i < items.length - 1) {
      // Use Gaussian delay for human-like behavior
      if (options.delayBetween) {
        await gaussianDelay({ mean: options.delayBetween, stdDev: options.delayBetween * 0.25 });
      } else {
        await gaussianDelay(INTERACTION_DELAYS.batchInterval);
      }
    }
  }

  return results;
}
