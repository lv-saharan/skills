/**
 * Follow functionality implementation
 *
 * @module interact/follow
 * @description Follow one or multiple users on Douyin
 */

import type { Page } from 'playwright';
import type { FollowOptions, FollowResult, UserIdExtraction } from './types';
import { FOLLOW_SELECTORS } from './selectors';
import {
  withAuthenticatedAction,
  preparePageForAction,
  INTERACTION_DELAYS,
} from './shared';
import { delay, randomDelay, debugLog } from '../utils/helpers';
import { humanClick, checkLoginStatus } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';
import { extractUserId } from './url-utils';

// ============================================
// Constants
// ============================================

const PAGE_LOAD_TIMEOUT = 20000;

// ============================================
// Follow Status Detection
// ============================================

/**
 * Check if user is already being followed
 *
 * Douyin indicates following state via:
 * 1. Button text change ("关注" → "已关注" or "互相关注")
 * 2. Class addition (active/following)
 * 3. aria-label text change
 *
 * @param page - Playwright page
 * @returns { visible: boolean, following: boolean }
 */
async function checkFollowStatus(page: Page): Promise<{ visible: boolean; following: boolean }> {
  try {
    // Try to find follow button using fallback selectors
    const buttonLocator = page.locator(FOLLOW_SELECTORS.button).first();
    if (!(await buttonLocator.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { visible: false, following: false };
    }

    // Check following state via button text
    const followingViaText = await page.evaluate(() => {
      // Look for "已关注" or "互相关注" text
      const followBtn = document.querySelector(
        'button:has-text("已关注"), button:has-text("互相关注"), button:has-text("Following")'
      );
      return followBtn !== null;
    });

    if (followingViaText) {
      debugLog('Following via text detection');
      return { visible: true, following: true };
    }

    // Check following state via class
    const followingViaClass = await page.evaluate(() => {
      const followBtn = document.querySelector(
        '[class*="follow"][class*="active"], [class*="follow"][class*="following"], [class*="followed"]'
      );
      return followBtn !== null;
    });

    if (followingViaClass) {
      debugLog('Following via class detection');
      return { visible: true, following: true };
    }

    // Check following state via aria-label
    const followingViaAttr = await page.evaluate(() => {
      const followBtn = document.querySelector('[class*="follow"], button:has-text("关注")');
      if (followBtn) {
        const ariaLabel = followBtn.getAttribute('aria-label') || '';
        const dataFollowing = followBtn.getAttribute('data-following');
        return ariaLabel.includes('已关注') || ariaLabel.includes('Following') || dataFollowing === 'true';
      }
      return false;
    });

    if (followingViaAttr) {
      debugLog('Following via attribute detection');
      return { visible: true, following: true };
    }

    // Default: visible but not following
    return { visible: true, following: false };
  } catch (error) {
    debugLog('Error checking follow status:', error);
    return { visible: false, following: false };
  }
}

// ============================================
// Core Follow Logic
// ============================================

/**
 * Perform follow operation on a single user profile
 *
 * @param page - Playwright page
 * @param url - User profile URL
 * @returns FollowResult
 */
async function performFollow(page: Page, url: string): Promise<FollowResult> {
  debugLog('开始执行关注...');

  // 1. Extract user ID from URL
  const extraction = extractUserId(url);
  if (!extraction.success) {
    return { success: false, url, userId: '', following: false, error: extraction.error };
  }
  const userId = extraction.userId!;

  try {
    // 2. Prepare page (navigate + error check + simulate reading)
    const pageError = await preparePageForAction(page, url);
    if (pageError) {
      return { success: false, url, userId, following: false, error: pageError };
    }

    // 3. Check current follow status
    const status = await checkFollowStatus(page);
    debugLog('状态: visible=' + status.visible + ', following=' + status.following);

    if (!status.visible) {
      return { success: false, url, userId, following: false, error: '关注按钮未找到' };
    }

    // Already following - skip clicking
    if (status.following) {
      debugLog('已关注，跳过');
      return { success: true, url, userId, following: true, alreadyFollowing: true };
    }

    // 4. Click follow button using human-like interaction
    debugLog('准备点击关注按钮...');
    const clicked = await humanClick(page, FOLLOW_SELECTORS.button, {
      delayBefore: 200,
      delayAfter: 300,
    });

    if (!clicked) {
      return { success: false, url, userId, following: false, error: '点击失败' };
    }

    await delay(1000 + Math.random() * 500);

    // 5. Check if login required after click
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, userId, following: false, error: '需要登录才能关注' };
    }

    // 6. Verify result
    const finalStatus = await checkFollowStatus(page);
    debugLog('最终状态: following=' + finalStatus.following);

    return { success: finalStatus.following, url, userId, following: finalStatus.following };
  } catch (e) {
    return {
      success: false,
      url,
      userId,
      following: false,
      error: e instanceof Error ? e.message : '未知错误',
    };
  }
}

// ============================================
// Main Execute Function
// ============================================

/**
 * Execute follow operation for one or multiple users
 *
 * - Single URL: output simple result
 * - Multiple URLs: output batch result with statistics
 *
 * @param options - Follow options
 */
export async function executeFollow(options: FollowOptions): Promise<void> {
  const { urls, headless, user, delayBetweenFollows } = options;
  const isSingle = urls.length === 1;

  debugLog('关注: urls=' + urls.length + ', single=' + isSingle + ', user=' + (user || 'default'));

  await withAuthenticatedAction(headless, user, async (page) => {
    const results: FollowResult[] = [];
    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < urls.length; i++) {
      const result = await performFollow(page, urls[i]);
      result.user = user;
      results.push(result);

      if (result.success) {
        result.alreadyFollowing ? skipped++ : succeeded++;
      } else {
        failed++;
      }

      // Delay between follows (not after last one)
      if (i < urls.length - 1) {
        const delayMs = delayBetweenFollows ?? INTERACTION_DELAYS.batchInterval;
        await randomDelay(delayMs, delayMs + 1000);
      }
    }

    // Output format based on URL count
    if (isSingle) {
      const result = results[0];
      if (!result.success && result.error) {
        outputSuccess(result, 'RELAY:' + result.error);
        return;
      }
      if (result.alreadyFollowing) {
        outputSuccess(result, 'RELAY:已经关注过了，跳过');
      } else if (result.following) {
        outputSuccess(result, 'RELAY:关注成功');
      } else {
        outputSuccess(result, 'RELAY:关注操作已执行，请检查结果');
      }
    } else {
      outputSuccess(
        { total: urls.length, succeeded, skipped, failed, results, user },
        'PARSE:results'
      );
    }
  }).catch((error) => {
    debugLog('关注出错:', error);
    outputFromError(error);
  });
}

// ============================================
// Re-export URL utilities
// ============================================

export { extractUserId };