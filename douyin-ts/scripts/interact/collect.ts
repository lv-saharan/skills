/**
 * Collect functionality implementation
 *
 * @module interact/collect
 * @description Collect (bookmark) one or multiple videos on Douyin
 */

import type { Page } from 'playwright';
import type { CollectOptions, CollectResult, NoteIdExtraction } from './types';
import { COLLECT_SELECTORS } from './selectors';
import {
  withAuthenticatedAction,
  preparePageForAction,
  INTERACTION_DELAYS,
} from './shared';
import { delay, randomDelay, debugLog } from '../utils/helpers';
import { humanClick, checkLoginStatus } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';
import { extractVideoId } from './url-utils';

// ============================================
// Collect Status Detection
// ============================================

/**
 * Check if video is already collected
 *
 * Douyin indicates collected state via:
 * 1. SVG xlink:href change (#collect → #collected)
 * 2. Class addition (active/collected)
 * 3. aria-label text ("已收藏")
 *
 * @param page - Playwright page
 * @returns { visible: boolean, collected: boolean }
 */
async function checkCollectStatus(page: Page): Promise<{ visible: boolean; collected: boolean }> {
  try {
    // Try to find collect button using fallback selectors
    const buttonLocator = page.locator(COLLECT_SELECTORS.button).first();
    if (!(await buttonLocator.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { visible: false, collected: false };
    }

    // Check collected state via SVG use element
    const collectedViaSvg = await page.evaluate(() => {
      // Try to find SVG use element in collect button area
      const useEl = document.querySelector(
        '[class*="collect"] svg use, [class*="favorite"] svg use, .interact-container svg use'
      );
      if (useEl) {
        const href = useEl.getAttribute('xlink:href') || useEl.getAttribute('href') || '';
        return href.includes('collected') || href.includes('collect-active') || href.includes('favorite-active');
      }
      return null;
    });

    if (collectedViaSvg === true) {
      debugLog('Collected via SVG href detection');
      return { visible: true, collected: true };
    }

    // Check collected state via class
    const collectedViaClass = await page.evaluate(() => {
      // Check for active/collected classes on collect button
      const collectBtn = document.querySelector(
        '[class*="collect"][class*="active"], [class*="collect"][class*="selected"], [class*="favorite"][class*="active"], [class*="collected"]'
      );
      return collectBtn !== null;
    });

    if (collectedViaClass) {
      debugLog('Collected via class detection');
      return { visible: true, collected: true };
    }

    // Check collected state via aria-label or data attribute
    const collectedViaAttr = await page.evaluate(() => {
      const collectBtn = document.querySelector('[class*="collect"], [class*="favorite"]');
      if (collectBtn) {
        const ariaLabel = collectBtn.getAttribute('aria-label') || '';
        const dataCollected = collectBtn.getAttribute('data-collected');
        return ariaLabel.includes('已收藏') || ariaLabel.includes('Collected') || dataCollected === 'true';
      }
      return false;
    });

    if (collectedViaAttr) {
      debugLog('Collected via attribute detection');
      return { visible: true, collected: true };
    }

    // Default: visible but not collected
    return { visible: true, collected: false };
  } catch (error) {
    debugLog('Error checking collect status:', error);
    return { visible: false, collected: false };
  }
}

// ============================================
// Core Collect Logic
// ============================================

/**
 * Perform collect operation on a single video
 *
 * @param page - Playwright page
 * @param url - Video URL
 * @returns CollectResult
 */
async function performCollect(page: Page, url: string): Promise<CollectResult> {
  debugLog('开始执行收藏...');

  // 1. Extract video ID from URL
  const extraction = extractVideoId(url);
  if (!extraction.success) {
    return { success: false, url, noteId: '', collected: false, error: extraction.error };
  }
  const noteId = extraction.noteId!;

  try {
    // 2. Prepare page (navigate + error check + simulate reading)
    const pageError = await preparePageForAction(page, url);
    if (pageError) {
      return { success: false, url, noteId, collected: false, error: pageError };
    }

    // 3. Check current collect status
    const status = await checkCollectStatus(page);
    debugLog('状态: visible=' + status.visible + ', collected=' + status.collected);

    if (!status.visible) {
      return { success: false, url, noteId, collected: false, error: '收藏按钮未找到' };
    }

    // Already collected - skip clicking
    if (status.collected) {
      debugLog('已收藏，跳过');
      return { success: true, url, noteId, collected: true, alreadyCollected: true };
    }

    // 4. Click collect button using human-like interaction
    debugLog('准备点击收藏按钮...');
    const clicked = await humanClick(page, COLLECT_SELECTORS.button, {
      delayBefore: 200,
      delayAfter: 300,
    });

    if (!clicked) {
      return { success: false, url, noteId, collected: false, error: '点击失败' };
    }

    await delay(1000 + Math.random() * 500);

    // 5. Check if login required after click
    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, collected: false, error: '需要登录才能收藏' };
    }

    // 6. Verify result
    const finalStatus = await checkCollectStatus(page);
    debugLog('最终状态: collected=' + finalStatus.collected);

    return { success: finalStatus.collected, url, noteId, collected: finalStatus.collected };
  } catch (e) {
    return {
      success: false,
      url,
      noteId,
      collected: false,
      error: e instanceof Error ? e.message : '未知错误',
    };
  }
}

// ============================================
// Main Execute Function
// ============================================

/**
 * Execute collect operation for one or multiple videos
 *
 * - Single URL: output simple result
 * - Multiple URLs: output batch result with statistics
 *
 * @param options - Collect options
 */
export async function executeCollect(options: CollectOptions): Promise<void> {
  const { urls, headless, user, delayBetweenCollects } = options;
  const isSingle = urls.length === 1;

  debugLog('收藏: urls=' + urls.length + ', single=' + isSingle + ', user=' + (user || 'default'));

  await withAuthenticatedAction(headless, user, async (page) => {
    const results: CollectResult[] = [];
    let succeeded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < urls.length; i++) {
      const result = await performCollect(page, urls[i]);
      result.user = user;
      results.push(result);

      if (result.success) {
        result.alreadyCollected ? skipped++ : succeeded++;
      } else {
        failed++;
      }

      // Delay between collects (not after last one)
      if (i < urls.length - 1) {
        const delayMs = delayBetweenCollects ?? INTERACTION_DELAYS.batchInterval;
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
      if (result.alreadyCollected) {
        outputSuccess(result, 'RELAY:已经收藏过了，跳过');
      } else if (result.collected) {
        outputSuccess(result, 'RELAY:收藏成功');
      } else {
        outputSuccess(result, 'RELAY:收藏操作已执行，请检查结果');
      }
    } else {
      outputSuccess(
        { total: urls.length, succeeded, skipped, failed, results, user },
        'PARSE:results'
      );
    }
  }).catch((error) => {
    debugLog('收藏出错:', error);
    outputFromError(error);
  });
}

// ============================================
// Re-export URL utilities
// ============================================

// Re-export for convenience (matches index.ts export)
export { extractVideoId as extractNoteId } from './url-utils';
