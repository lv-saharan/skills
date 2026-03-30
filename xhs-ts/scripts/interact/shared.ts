/**
 * Interact module shared utilities
 *
 * @module interact/shared
 * @description Common utilities for interaction operations (like, collect, comment, follow)
 */

import type { Page } from 'playwright';
import type { UserName } from '../user';
import { withProfile, randomStealthDelay, type ProfileLaunchOptions, type StealthBehaviorConfig } from '../browser';
import { resolveUser } from '../user/storage';
import { XhsError, XhsErrorCode, TIMEOUTS } from '../shared';
import { XHS_URLS, delay, gaussianDelay } from '../utils/helpers';
import { checkLoginStatus, checkCaptcha, simulateReading } from '../utils/anti-detect';

// ============================================
// Constants
// ============================================

/** Page load timeout for interaction operations */
export const INTERACTION_PAGE_LOAD_TIMEOUT = 20000;

/**
 * Default delay constants for interaction operations
 * These are used as fallback when behavior config is not available
 */
export const DEFAULT_INTERACTION_DELAYS = {
  /** Delay after page navigation */
  afterNavigation: { mean: 2000, stdDev: 400 },
  /** Delay after click action */
  afterClick: { mean: 1200, stdDev: 300 },
  /** Default batch operation interval */
  batchInterval: { mean: 3000, stdDev: 800 },
} as const;

/** @deprecated Use DEFAULT_INTERACTION_DELAYS instead */
export const INTERACTION_DELAYS = DEFAULT_INTERACTION_DELAYS;

/**
 * Get interaction delays based on behavior config
 * Uses behavior config if available, otherwise falls back to defaults
 */
export function getInteractionDelays(behavior?: StealthBehaviorConfig): typeof DEFAULT_INTERACTION_DELAYS {
  if (!behavior) {
    return DEFAULT_INTERACTION_DELAYS;
  }

  // Convert behavior timing to interaction delays format
  return {
    afterNavigation: {
      mean: (behavior.minReadTime + (behavior.maxReadTime - behavior.minReadTime) / 2) as 2000,
      stdDev: ((behavior.maxReadTime - behavior.minReadTime) / 4) as 400,
    },
    afterClick: {
      mean: (behavior.minActionDelay + (behavior.maxActionDelay - behavior.minActionDelay) / 2) as 1200,
      stdDev: ((behavior.maxActionDelay - behavior.minActionDelay) / 4) as 300,
    },
    batchInterval: {
      mean: (behavior.minActionDelay + (behavior.maxActionDelay - behavior.minActionDelay) / 2) as 3000,
      stdDev: ((behavior.maxActionDelay - behavior.minActionDelay) / 4) as 800,
    },
  };
}

// ============================================
// Session Utilities
// ============================================

/**
 * Execute an action with authenticated session using Profile architecture
 *
 * This function handles:
 * 1. Launching profile browser (login state is persisted)
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
  callback: (page: Page, behavior: StealthBehaviorConfig) => Promise<T>
): Promise<T> {
  const resolvedUser = user ?? resolveUser();

  // Use withProfile for automatic login state persistence
  return withProfile(
    resolvedUser,
    async (page, profileResult) => {
      const { behavior } = profileResult;

      // 1. Navigate to homepage to establish session
      await page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
      await randomStealthDelay(behavior, 'read');

      // 2. Verify login status
      if (!(await checkLoginStatus(page))) {
        throw new XhsError('未登录，请先执行 "xhs login"', XhsErrorCode.NOT_LOGGED_IN);
      }

      // 3. Execute the callback with authenticated page and behavior config
      return callback(page, behavior);
    },
    { headless: headless ?? false } as ProfileLaunchOptions
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
  await gaussianDelay(DEFAULT_INTERACTION_DELAYS.afterNavigation);
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
        await gaussianDelay(DEFAULT_INTERACTION_DELAYS.batchInterval);
      }
    }
  }

  return results;
}
