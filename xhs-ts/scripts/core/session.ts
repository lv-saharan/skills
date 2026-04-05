/**
 * Core Session Management
 *
 * @module core/session
 * @description Cross-module session orchestration: browser lifecycle + authentication + navigation
 *
 * This module provides a unified session layer that decouples feature modules
 * (search, publish, interact, scrape) from direct browser/login imports.
 */

import type { Page } from 'playwright';
import type { UserName } from '../user';
import type { StealthBehaviorConfig } from '../browser';
import { withProfile, randomStealthDelay, type ProfileLaunchOptions } from '../browser';
import { resolveUser } from '../user';
import { XhsError, XhsErrorCode, TIMEOUTS, XHS_URLS } from '../shared';
import { ensureLogin } from '../login';
import { gaussianDelay } from '../utils/helpers';
import { DELAYS } from '../shared';

// ============================================
// Types
// ============================================

export interface SessionContext {
  page: Page;
  user: UserName;
  behavior: StealthBehaviorConfig;
  cdpPort: number;
  isNewInstance: boolean;
}

export interface SessionOptions {
  headless?: boolean;
  autoCreate?: boolean;
  skipLogin?: boolean;
  /** Navigate to home page after launch (default: true) */
  navigateHome?: boolean;
}

// ============================================
// Session API
// ============================================

/**
 * High-level session: browser + auth + callback
 *
 * Encapsulates the common pattern used across all feature modules:
 * 1. Launch browser with user profile
 * 2. Navigate to home page
 * 3. Ensure login (auto-login if needed)
 * 4. Execute callback
 *
 * @param user - User name (resolved via priority if undefined)
 * @param callback - Async function receiving session context
 * @param options - Session configuration
 * @returns Callback result
 */
export async function withSession<T>(
  user: UserName | undefined,
  callback: (ctx: SessionContext) => Promise<T>,
  options: SessionOptions = {}
): Promise<T> {
  const { headless = false, autoCreate = true, skipLogin = false, navigateHome = true } = options;
  const resolvedUser = user ?? resolveUser();

  return withProfile(
    resolvedUser,
    async (page, profileResult) => {
      const { behavior, cdpPort, isNewInstance } = profileResult;

      // Navigate to home page
      if (navigateHome) {
        await page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
        await randomStealthDelay(behavior, 'read');
      }

      // Ensure authentication (unless explicitly skipped)
      if (!skipLogin) {
        const loginResult = await ensureLogin(page, {
          user: resolvedUser,
          headless,
          timeout: TIMEOUTS.LOGIN,
        });

        if (!loginResult.success) {
          throw new XhsError(loginResult.message || 'Not logged in', XhsErrorCode.NOT_LOGGED_IN);
        }
      }

      return callback({
        page,
        user: resolvedUser,
        behavior,
        cdpPort,
        isNewInstance,
      });
    },
    { headless, autoCreate } as ProfileLaunchOptions
  );
}

// ============================================
// Page Utilities (Session-Aware)
// ============================================

/**
 * Navigate to a URL with proper loading and human-like delay
 */
export async function navigateTo(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
  await page.waitForLoadState('networkidle', { timeout: TIMEOUTS.NETWORK_IDLE }).catch(() => {});
  await gaussianDelay(DELAYS.afterNavigation);
}

/**
 * Prepare page for interaction: navigate + error check + simulate reading
 */
export async function preparePage(page: Page, url: string): Promise<string | null> {
  await navigateTo(page, url);
  return checkPageHealth(page);
}

// ============================================
// Health Checks
// ============================================

/**
 * Check page for common error states
 *
 * @returns Error message string or null if healthy
 */
export async function checkPageHealth(page: Page): Promise<string | null> {
  const { checkLoginStatus, checkCaptcha } = await import('../utils/anti-detect');

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

// ============================================
// Batch Operation Utilities
// ============================================

export interface BatchOptions {
  delayBetween?: number;
  onProgress?: (completed: number, total: number) => void;
}

/**
 * Execute operations on a list of items with configurable delays
 */
export async function executeBatch<T, R>(
  items: T[],
  processItem: (item: T, index: number) => Promise<R>,
  options: BatchOptions = {}
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
