/**
 * Like functionality implementation
 *
 * @module interact/like
 * @description Like one or multiple videos on Douyin
 */

import type { Page } from 'playwright';
import type { LikeOptions, LikeResult, NoteIdExtraction } from './types';
import { LIKE_SELECTORS } from './selectors';
import {
  withAuthenticatedAction,
  preparePageForAction,
  INTERACTION_DELAYS,
} from './shared';
import { DouyinError, DouyinErrorCode } from '../shared';
import { delay, randomDelay, debugLog } from '../utils/helpers';
import { humanClick, checkLoginStatus } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';
import { extractVideoId } from './url-utils';

// ============================================
// Constants
// ============================================

const PAGE_LOAD_TIMEOUT = 20000;

// ============================================
// Like Status Detection
// ============================================

/**
 * Check if video is already liked
 *
 * Douyin indicates liked state via:
 * 1. SVG xlink:href change (#like → #liked)
 * 2. Class addition (active/liked)
 * 3. Color change (gray → red)
 *
 * @param page - Playwright page
 * @returns { visible: boolean, liked: boolean }
 */
async function checkLikeStatus(page: Page): Promise<{ visible: boolean; liked: boolean }> {
  try {
    // Try to find like button using fallback selectors
    const buttonLocator = page.locator(LIKE_SELECTORS.button).first();
    if (!(await buttonLocator.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { visible: false, liked: false };
    }

    // Check liked state via SVG use element (similar to XHS pattern)
    const likedViaSvg = await page.evaluate(() => {
      // Try to find SVG use element in like button area
      const useEl = document.querySelector(
        '[class*="digg"] svg use, [class*="like"] svg use, .interact-container svg use'
      );
      if (useEl) {
        const href = useEl.getAttribute('xlink:href') || useEl.getAttribute('href') || '';
        return href.includes('liked') || href.includes('digg-active');
      }
      return null;
    });

    if (likedViaSvg === true) {
      debugLog('Liked via SVG href detection');
      return { visible: true, liked: true };
    }

    // Check liked state via class
    const likedViaClass = await page.evaluate(() => {
      // Check for active/liked classes on like button
      const likeBtn = document.querySelector(
        '[class*="digg"][class*="active"], [class*="like"][class*="active"], [class*="liked"]'
      );
      return likeBtn !== null;
    });

    if (likedViaClass) {
      debugLog('Liked via class detection');
      return { visible: true, liked: true };
    }

    // Check liked state via aria-label or data attribute
    const likedViaAttr = await page.evaluate(() => {
      const likeBtn = document.querySelector('[class*="digg"], [class*="like"]');
      if (likeBtn) {
        const ariaLabel = likeBtn.getAttribute('aria-label') || '';
        const dataLiked = likeBtn.getAttribute('data-liked');
        return ariaLabel.includes('已赞') || ariaLabel.includes('Liked') || dataLiked === 'true';
      }
      return false;
    });

    if (likedViaAttr) {
      debugLog('Liked via attribute detection');
      return { visible: true, liked: true };
    }

    // Default: visible but not liked
    return { visible: true, liked: false };
  } catch (error) {
    debugLog('Error checking like status:', error);
    return { visible: false, liked: false };
  }
}

// ============================================
// Core Like Logic
// ============================================

/**
 * Perform like operation on a single video
 *
 * @param page - Playwright page
 * @param url - Video URL
 * @returns LikeResult
 */
async function performLike(page: Page, url: string): Promise<LikeResult> {
  debugLog('开始执行点赞...');

  // 1. Extract video ID from URL
  const extraction = extractVideoId(url);
  if (!extraction.success) {
    return { success: false, url, noteId: '', liked: false, error: extraction.error };
  }
  const noteId = extraction.noteId!;

  try {
    // 2. Prepare page (navigate + error check + simulate reading)
    const pageError = await preparePageForAction(page, url);
    if (pageError) {
      return { success: false, url, noteId, liked: false, error: pageError };
    }

    // 3. Check current like status
    const status = await checkLikeStatus(page);
    debugLog('状态: visible=' + status.visible + ', liked=' + status.liked);

    if (!status.visible) {
      return { success: false, url, noteId, liked: false, error: '点赞按钮未找到' };
    }

    // Already liked - skip clicking
    if (status.liked) {
      debugLog('已点赞，跳过');
      return { success: true, url, noteId, liked: true, alreadyLiked: true };
    }

    // 4. Click like button using human-like interaction
    debugLog('准备点击点赞按钮...');
    const clicked = await humanClick(page, LIKE_SELECTORS.button, {
      delayBefore: 200,
      delayAfter: 300,
    });

    if (!clicked) {
      return { success: false, url, noteId, liked: false, error: '点击失败' };
    }

    await delay(1000 + Math.random() * 500);

    // 5. Check if login required after click
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, liked: false, error: '需要登录才能点赞' };
    }

    // 6. Verify result
    const finalStatus = await checkLikeStatus(page);
    debugLog('最终状态: liked=' + finalStatus.liked);

    return { success: finalStatus.liked, url, noteId, liked: finalStatus.liked };
  } catch (e) {
    return {
      success: false,
      url,
      noteId,
      liked: false,
      error: e instanceof Error ? e.message : '未知错误',
    };
  }
}

// ============================================
// Main Execute Function
// ============================================

/**
 * Execute like operation for one or multiple videos
 *
 * - Single URL: output simple result
 * - Multiple URLs: output batch result with statistics
 *
 * @param options - Like options
 */
export async function executeLike(options: LikeOptions): Promise<void> {
  const { urls, headless, user, delayBetweenLikes } = options;
  const isSingle = urls.length === 1;

  debugLog('点赞: urls=' + urls.length + ', single=' + isSingle + ', user=' + (user || 'default'));

  await withAuthenticatedAction(headless, user, async (page) => {
    const results: LikeResult[] = [];
    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < urls.length; i++) {
      const result = await performLike(page, urls[i]);
      result.user = user;
      results.push(result);

      if (result.success) {
        result.alreadyLiked ? skipped++ : succeeded++;
      } else {
        failed++;
      }

      // Delay between likes (not after last one)
      if (i < urls.length - 1) {
        const delayMs = delayBetweenLikes ?? INTERACTION_DELAYS.batchInterval;
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
      if (result.alreadyLiked) {
        outputSuccess(result, 'RELAY:已经点赞过了，跳过');
      } else if (result.liked) {
        outputSuccess(result, 'RELAY:点赞成功');
      } else {
        outputSuccess(result, 'RELAY:点赞操作已执行，请检查结果');
      }
    } else {
      outputSuccess(
        { total: urls.length, succeeded, skipped, failed, results, user },
        'PARSE:results'
      );
    }
  }).catch((error) => {
    debugLog('点赞出错:', error);
    outputFromError(error);
  });
}

// ============================================
// Re-export URL utilities
// ============================================

// Re-export for convenience (matches index.ts export)
export { extractVideoId as extractNoteId } from './url-utils';