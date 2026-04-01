/**
 * Interact module shared utilities
 *
 * @module interact/shared
 * @description Common utilities for interaction operations (like, collect, comment, follow)
 */

import type { Page } from 'playwright';
import type { UserName } from '../user';
import {
  withProfile,
  randomStealthDelay,
  type ProfileLaunchOptions,
  type StealthBehaviorConfig,
} from '../browser';
import { resolveUser } from '../user/storage';
import { XhsError, XhsErrorCode, TIMEOUTS } from '../shared';
import { XHS_URLS, gaussianDelay } from '../utils/helpers';
import { checkLoginStatus, checkCaptcha, simulateReading } from '../utils/anti-detect';
import { ensureLogin } from '../login';

// ============================================
// Constants
// ============================================

export const INTERACTION_PAGE_LOAD_TIMEOUT = 20000;

export const DEFAULT_INTERACTION_DELAYS = {
  afterNavigation: { mean: 2000, stdDev: 400 },
  afterClick: { mean: 1200, stdDev: 300 },
  batchInterval: { mean: 3000, stdDev: 800 },
} as const;

export const INTERACTION_DELAYS = DEFAULT_INTERACTION_DELAYS;

export function getInteractionDelays(
  behavior?: StealthBehaviorConfig
): typeof DEFAULT_INTERACTION_DELAYS {
  if (!behavior) {
    return DEFAULT_INTERACTION_DELAYS;
  }

  return {
    afterNavigation: {
      mean: (behavior.minReadTime + (behavior.maxReadTime - behavior.minReadTime) / 2) as 2000,
      stdDev: ((behavior.maxReadTime - behavior.minReadTime) / 4) as 400,
    },
    afterClick: {
      mean: (behavior.minActionDelay +
        (behavior.maxActionDelay - behavior.minActionDelay) / 2) as 1200,
      stdDev: ((behavior.maxActionDelay - behavior.minActionDelay) / 4) as 300,
    },
    batchInterval: {
      mean: (behavior.minActionDelay +
        (behavior.maxActionDelay - behavior.minActionDelay) / 2) as 3000,
      stdDev: ((behavior.maxActionDelay - behavior.minActionDelay) / 4) as 800,
    },
  };
}

// ============================================
// Session Utilities
// ============================================

export async function withAuthenticatedAction<T>(
  headless: boolean | undefined,
  user: UserName | undefined,
  callback: (page: Page, behavior: StealthBehaviorConfig) => Promise<T>
): Promise<T> {
  const resolvedUser = user ?? resolveUser();

  return withProfile(
    resolvedUser,
    async (page, profileResult) => {
      const { behavior } = profileResult;

      await page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
      await randomStealthDelay(behavior, 'read');

      // Ensure login (auto-login if needed)
      const loginResult = await ensureLogin(page, {
        user: resolvedUser,
        headless: headless ?? false,
        timeout: TIMEOUTS.LOGIN,
      });

      if (!loginResult.success) {
        throw new XhsError(loginResult.message || 'Not logged in', XhsErrorCode.NOT_LOGGED_IN);
      }

      return callback(page, behavior);
    },
    { headless: headless ?? false } as ProfileLaunchOptions
  );
}

// ============================================
// Page Utilities
// ============================================

export async function navigateToPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
  await page
    .waitForLoadState('networkidle', { timeout: INTERACTION_PAGE_LOAD_TIMEOUT })
    .catch(() => {});
  await gaussianDelay(DEFAULT_INTERACTION_DELAYS.afterNavigation);
}

export async function checkPageErrors(page: Page): Promise<string | null> {
  if (!(await checkLoginStatus(page))) {
    return '需要登录';
  }

  if (await checkCaptcha(page)) {
    return '检测到验证码';
  }

  const pageContent = await page.content();
  if (pageContent.includes('当前笔记暂时无法浏览') || pageContent.includes('页面不见了')) {
    return '页面不可访问';
  }
  if (pageContent.includes('用户不存在')) {
    return '用户不存在';
  }

  return null;
}

export async function preparePageForAction(page: Page, url: string): Promise<string | null> {
  await navigateToPage(page, url);

  const error = await checkPageErrors(page);
  if (error) {
    return error;
  }

  await simulateReading(page);

  return null;
}

// ============================================
// Batch Operation Utilities
// ============================================

export async function executeBatch<T, R>(
  items: T[],
  processItem: (item: T, index: number) => Promise<R>,
  options: {
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

    if (i < items.length - 1) {
      if (options.delayBetween) {
        await gaussianDelay({ mean: options.delayBetween, stdDev: options.delayBetween * 0.25 });
      } else {
        await gaussianDelay(DEFAULT_INTERACTION_DELAYS.batchInterval);
      }
    }
  }

  return results;
}
