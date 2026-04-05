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
import { resolveUser } from '../user';
import { XhsError, XhsErrorCode, TIMEOUTS, DELAYS, XHS_URLS } from '../shared';
import { gaussianDelay } from '../utils/helpers';
import { checkLoginStatus, checkCaptcha, simulateReading } from '../utils/anti-detect';
import { ensureLogin } from '../login';

// ============================================
// Delay Utilities
// ============================================

/** Re-export unified delay constants from shared for backward compatibility */
export const INTERACTION_DELAYS = DELAYS;

export interface InteractionDelayPreset {
  mean: number;
  stdDev: number;
}

export function getInteractionDelays(behavior?: StealthBehaviorConfig): {
  afterNavigation: { mean: number; stdDev: number };
  afterClick: { mean: number; stdDev: number };
  batchInterval: { mean: number; stdDev: number };
} {
  if (!behavior) {
    return DELAYS;
  }

  return {
    afterNavigation: {
      mean: behavior.minReadTime + (behavior.maxReadTime - behavior.minReadTime) / 2,
      stdDev: (behavior.maxReadTime - behavior.minReadTime) / 4,
    },
    afterClick: {
      mean: behavior.minActionDelay + (behavior.maxActionDelay - behavior.minActionDelay) / 2,
      stdDev: (behavior.maxActionDelay - behavior.minActionDelay) / 4,
    },
    batchInterval: {
      mean: behavior.minActionDelay + (behavior.maxActionDelay - behavior.minActionDelay) / 2,
      stdDev: (behavior.maxActionDelay - behavior.minActionDelay) / 4,
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
    { headless: headless ?? false, autoCreate: true } as ProfileLaunchOptions
  );
}

// ============================================
// Page Utilities
// ============================================

export async function navigateToPage(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
  await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  await gaussianDelay(DELAYS.afterNavigation);
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
        await gaussianDelay(DELAYS.batchInterval);
      }
    }
  }

  return results;
}
