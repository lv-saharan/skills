/**
 * Like functionality implementation
 *
 * @module interact/like
 * @description Like one or multiple notes on Xiaohongshu
 */

import type { Page } from 'playwright';
import type { LikeOptions, LikeResult } from './types';
import { LIKE_SELECTORS } from '../shared/selectors';
import { debugLog, gaussianDelay } from '../../core/utils';
import { outputSuccess, outputFromError } from '../../core/utils/output';
import { withSession } from '../shared/session';
import { resolveUser } from '../../user';
import { performInteractAction } from './core';

// ============================================
// URL Parsing
// ============================================

export { extractNoteId } from '../shared/url-utils';

// ============================================
// Core Like Logic
// ============================================

/**
 * Perform like action on a single note
 */
async function performLike(page: Page, url: string, user: string): Promise<LikeResult> {
  const result = await performInteractAction(page, url, user, {
    actionName: '点赞',
    buttonSelector: LIKE_SELECTORS.button,
    svgStatus: {
      wrapperSelector: '.like-wrapper',
      activeAttrValue: '#liked',
    },
  });

  return {
    success: result.success,
    url,
    noteId: result.noteId,
    liked: result.active,
    alreadyLiked: result.alreadyDone,
    error: result.error,
  };
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
          const result = await performLike(page, urls[i], ctx.user);
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
