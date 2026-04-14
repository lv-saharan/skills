/**
 * Follow functionality implementation
 *
 * @module interact/follow
 * @description Follow one or multiple users on Xiaohongshu using button text detection
 */

import type { Page, Locator } from 'playwright';
import type { FollowOptions, FollowResult } from './types';
import { FOLLOW_SELECTORS } from '../shared/selectors';
import { extractUserIdFromUrl } from '../shared/url-utils';
import { debugLog, gaussianDelay } from '../../core/utils';
import { humanClick } from '../../core/anti-detect';
import { isLoggedIn } from '../auth/status';
import { outputSuccess, outputFromError } from '../../core/utils/output';
import { withSession, INTERACTION_DELAYS } from '../shared/session';
import { preparePageForAction } from '../shared/page-prep';
import { resolveUser } from '../../user';

// ============================================
// Follow Status Detection
// ============================================

/**
 * Find the main follow button on user profile page
 *
 * Priority:
 * 1. Primary button: .reds-button-new.follow-button (most specific)
 * 2. Fallback buttons: other follow button patterns
 *
 * This ensures we click the MAIN follow button, not buttons in
 * recommended users section or other areas.
 */
async function findFollowButton(page: Page): Promise<Locator | null> {
  // Try primary selector first (most specific)
  const primaryLocator = page.locator(FOLLOW_SELECTORS.primaryButton).first();
  if (await primaryLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
    debugLog('Found follow button using primary selector');
    return primaryLocator;
  }

  // Fallback to combined selectors
  const fallbackLocator = page.locator(FOLLOW_SELECTORS.fallbackButtons).first();
  if (await fallbackLocator.isVisible({ timeout: 2000 }).catch(() => false)) {
    debugLog('Found follow button using fallback selector');
    return fallbackLocator;
  }

  return null;
}

/**
 * 通过按钮文本判断关注状态
 * - "已关注" / "Following" / "互相关注" = 已关注
 * - "关注" / "Follow" / "+ 关注" = 未关注
 *
 * Uses Playwright locator API with priority selector
 */
async function checkFollowStatus(page: Page): Promise<{ visible: boolean; following: boolean }> {
  try {
    const buttonLocator = await findFollowButton(page);

    if (!buttonLocator) {
      return { visible: false, following: false };
    }

    // Get button text using Playwright API (more reliable than page.evaluate)
    const buttonText = (await buttonLocator.textContent())?.trim() || '';

    if (!buttonText) {
      return { visible: true, following: false };
    }

    debugLog('Follow button text: ' + buttonText);

    // Check if already following (button shows "已关注" or "Following")
    // Use exact matching to avoid false positives like "相互关注"
    const normalizedText = buttonText.replace(/\s+/g, ' ').trim();
    const isFollowing =
      normalizedText === '已关注' ||
      normalizedText === '互相关注' ||
      normalizedText.toLowerCase() === 'following' ||
      normalizedText === '相互关注';

    return { visible: true, following: isFollowing };
  } catch {
    return { visible: false, following: false };
  }
}

// ============================================
// Core Follow Logic
// ============================================

async function performFollow(page: Page, url: string, user: string): Promise<FollowResult> {
  debugLog('开始执行关注...');

  const extraction = extractUserIdFromUrl(url);
  if (!extraction.success) {
    return { success: false, url, userId: '', following: false, error: extraction.error };
  }
  const userId = extraction.userId!;

  // Prepare page (navigate + check errors + simulate reading)
  // Note: For user pages, we need to check for different error messages
  const prep = await preparePageForAction(page, url, user);
  if (!prep.success) {
    // Check for user-specific errors
    const pageContent = await page.content();
    if (pageContent.includes('用户不存在')) {
      return { success: false, url, userId, following: false, error: '用户不存在' };
    }
    return { success: false, url, userId, following: false, error: prep.error };
  }

  // Check current follow status
  const status = await checkFollowStatus(page);
  debugLog('状态: visible=' + status.visible + ', following=' + status.following);

  if (!status.visible) {
    return { success: false, url, userId, following: false, error: '关注按钮未找到' };
  }

  // Already following - skip
  if (status.following) {
    debugLog('已关注，跳过');
    return { success: true, url, userId, following: true, alreadyFollowing: true };
  }

  // Click follow button using primary selector
  debugLog('准备点击关注按钮...');
  const clicked = await humanClick(page, FOLLOW_SELECTORS.primaryButton, {
    delayBefore: 200,
    delayAfter: 300,
  });

  // If primary selector failed, try fallback
  if (!clicked) {
    debugLog('Primary selector failed, trying fallback...');
    const fallbackClicked = await humanClick(page, FOLLOW_SELECTORS.fallbackButtons, {
      delayBefore: 200,
      delayAfter: 300,
    });

    if (!fallbackClicked) {
      return { success: false, url, userId, following: false, error: '点击失败' };
    }
  }

  await gaussianDelay(INTERACTION_DELAYS.batchInterval);

  // Check if login required after click
  if (!(await isLoggedIn(page))) {
    return { success: false, url, userId, following: false, error: '需要登录才能关注' };
  }

  // Verify result
  const finalStatus = await checkFollowStatus(page);
  debugLog('最终状态: following=' + finalStatus.following);

  return { success: finalStatus.following, url, userId, following: finalStatus.following };
}

// ============================================
// Main Execute Function (Unified)
// ============================================

/**
 * Execute follow operation for one or multiple users
 * - Single URL: output simple result
 * - Multiple URLs: output batch result with statistics
 */
export async function executeFollow(options: FollowOptions): Promise<void> {
  const { urls, headless, user, delayBetweenFollows } = options;
  const isSingle = urls.length === 1;
  const resolvedUser = user ?? resolveUser();

  debugLog('关注: urls=' + urls.length + ', single=' + isSingle + ', user=' + resolvedUser);

  try {
    await withSession(
      user,
      async (ctx) => {
        const { page } = ctx;

        const results: FollowResult[] = [];
        let succeeded = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < urls.length; i++) {
          const result = await performFollow(page, urls[i], ctx.user);
          result.user = resolvedUser;
          results.push(result);

          if (result.success) {
            result.alreadyFollowing ? skipped++ : succeeded++;
          } else {
            failed++;
          }

          // Delay between follows (not after last one)
          if (i < urls.length - 1) {
            // Use Gaussian delay for human-like behavior
            if (delayBetweenFollows) {
              await gaussianDelay({
                mean: delayBetweenFollows,
                stdDev: delayBetweenFollows * 0.25,
              });
            } else {
              await gaussianDelay(INTERACTION_DELAYS.batchInterval);
            }
          }
        }

        // Output format based on URL count
        if (isSingle) {
          const result = results[0];
          if (!result.success && result.error) {
            outputSuccess(result, 'RELAY:' + result.error);
          } else if (result.alreadyFollowing) {
            outputSuccess(result, 'RELAY:已经关注过了，跳过');
          } else if (result.following) {
            outputSuccess(result, 'RELAY:关注成功');
          } else {
            outputSuccess(result, 'RELAY:关注操作已执行，请检查结果');
          }
        } else {
          outputSuccess(
            { total: urls.length, succeeded, skipped, failed, results, user: resolvedUser },
            'PARSE:results'
          );
        }
      },
      { headless }
    );
  } catch (error) {
    debugLog('关注出错:', error);
    outputFromError(error);
  }
}
