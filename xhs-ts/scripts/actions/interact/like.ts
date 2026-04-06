/**
 * Like functionality implementation
 *
 * @module interact/like
 * @description Like one or multiple notes on Xiaohongshu using SVG use element detection
 */

import type { Page } from 'playwright';
import type { LikeOptions, LikeResult } from './types';
import { extractNoteIdFromUrl } from '../shared/url-utils';
import { LIKE_SELECTORS } from './selectors';
import { timeouts } from '../../config';
import { debugLog, delay, gaussianDelay } from '../../core/utils';
import {
  humanClick,
  checkCaptcha,
  checkLoginStatus,
  simulateReading,
} from '../../core/anti-detect';
import { outputSuccess, outputFromError } from '../../core/utils/output';
import { withSession } from '../shared/session';
import { resolveUser } from '../../user';

// ============================================
// URL Parsing
// ============================================

export { extractNoteId } from '../shared/url-utils';

// ============================================
// Like Status Detection (SVG use element)
// ============================================

async function checkLikeStatus(page: Page): Promise<{ visible: boolean; liked: boolean }> {
  try {
    const wrapper = page.locator(LIKE_SELECTORS.button).first();
    if (!(await wrapper.isVisible({ timeout: 3000 }).catch(() => false))) {
      return { visible: false, liked: false };
    }

    const href = await page.evaluate(() => {
      const useEl = document.querySelector('.interact-container .like-wrapper svg use');
      return useEl ? useEl.getAttribute('xlink:href') || useEl.getAttribute('href') : null;
    });

    if (!href) {
      return { visible: true, liked: false };
    }

    debugLog('SVG use href: ' + href);
    return { visible: true, liked: href === '#liked' };
  } catch {
    return { visible: false, liked: false };
  }
}

// ============================================
// Core Like Logic
// ============================================

async function performLike(page: Page, url: string): Promise<LikeResult> {
  debugLog('开始执行点赞...');

  const extraction = extractNoteIdFromUrl(url);
  if (!extraction.success) {
    return { success: false, url, noteId: '', liked: false, error: extraction.error };
  }
  const noteId = extraction.noteId!;

  try {
    debugLog('导航到: ' + url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
    await page.waitForLoadState('networkidle', { timeout: timeouts.networkIdle }).catch(() => {});
    await delay(1500 + Math.random() * 1000);

    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, liked: false, error: '需要登录' };
    }
    if (await checkCaptcha(page)) {
      return { success: false, url, noteId, liked: false, error: '检测到验证码' };
    }

    const pageContent = await page.content();
    if (pageContent.includes('当前笔记暂时无法浏览') || pageContent.includes('页面不见了')) {
      return { success: false, url, noteId, liked: false, error: '笔记不可访问' };
    }

    await simulateReading(page);

    const status = await checkLikeStatus(page);
    debugLog('状态: visible=' + status.visible + ', liked=' + status.liked);

    if (!status.visible) {
      return { success: false, url, noteId, liked: false, error: '点赞按钮未找到' };
    }

    if (status.liked) {
      debugLog('已点赞，跳过');
      return { success: true, url, noteId, liked: true, alreadyLiked: true };
    }

    debugLog('准备点击点赞按钮...');
    const clicked = await humanClick(page, LIKE_SELECTORS.button, {
      delayBefore: 200,
      delayAfter: 300,
    });

    if (!clicked) {
      return { success: false, url, noteId, liked: false, error: '点击失败' };
    }

    await delay(1000 + Math.random() * 500);

    if (!(await checkLoginStatus(page))) {
      return { success: false, url, noteId, liked: false, error: '需要登录才能点赞' };
    }

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
 * Execute like operation for one or multiple notes
 */
export async function executeLike(options: LikeOptions): Promise<void> {
  const { urls, headless, user, delayBetweenLikes } = options;
  const isSingle = urls.length === 1;
  const resolvedUser = user ?? resolveUser();

  debugLog('点赞: urls=' + urls.length + ', single=' + isSingle + ', user=' + resolvedUser);

  try {
    await withSession(
      user,
      async (ctx) => {
        const { page } = ctx;

        const results: LikeResult[] = [];
        let succeeded = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < urls.length; i++) {
          const result = await performLike(page, urls[i]);
          result.user = resolvedUser;
          results.push(result);

          if (result.success) {
            result.alreadyLiked ? skipped++ : succeeded++;
          } else {
            failed++;
          }

          if (i < urls.length - 1) {
            const delayMs = delayBetweenLikes ?? 2000;
            await gaussianDelay({ mean: delayMs, stdDev: delayMs * 0.25 });
          }
        }

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
            { total: urls.length, succeeded, skipped, failed, results, user: resolvedUser },
            'PARSE:results'
          );
        }
      },
      { headless }
    );
  } catch (error) {
    debugLog('点赞出错:', error);
    outputFromError(error);
  }
}
