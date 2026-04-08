/**
 * Collect (bookmark) functionality implementation
 *
 * @module interact/collect
 * @description Collect (bookmark) one or multiple notes on Xiaohongshu
 */

import type { Page } from 'playwright';
import type { CollectOptions, CollectResult } from './types';
import { COLLECT_SELECTORS } from '../shared/selectors';
import { debugLog, gaussianDelay } from '../../core/utils';
import { outputSuccess, outputFromError } from '../../core/utils/output';
import { withSession } from '../shared/session';
import { resolveUser } from '../../user';
import { performInteractAction } from './core';

// ============================================
// Core Collect Logic
// ============================================

/**
 * Perform collect action on a single note
 */
async function performCollect(page: Page, url: string, user: string): Promise<CollectResult> {
  const result = await performInteractAction(page, url, user, {
    actionName: '收藏',
    buttonSelector: COLLECT_SELECTORS.button,
    svgStatus: {
      wrapperSelector: '.collect-wrapper',
      activeAttrValue: '#collected',
    },
  });

  return {
    success: result.success,
    url,
    noteId: result.noteId,
    collected: result.active,
    alreadyCollected: result.alreadyDone,
    error: result.error,
  };
}

// ============================================
// Main Execute Function
// ============================================

/**
 * Execute collect operation for one or multiple notes
 */
export async function executeCollect(options: CollectOptions): Promise<void> {
  const { urls, headless, user, delayBetweenCollects } = options;
  const isSingle = urls.length === 1;
  const resolvedUser = user ?? resolveUser();

  debugLog('收藏: urls=' + urls.length + ', single=' + isSingle + ', user=' + resolvedUser);

  try {
    await withSession(
      user,
      async (ctx) => {
        const { page } = ctx;

        const results: CollectResult[] = [];
        let succeeded = 0;
        let skipped = 0;
        let failed = 0;

        for (let i = 0; i < urls.length; i++) {
          const result = await performCollect(page, urls[i], ctx.user);
          result.user = resolvedUser;
          results.push(result);

          if (result.success) {
            result.alreadyCollected ? skipped++ : succeeded++;
          } else {
            failed++;
          }

          if (i < urls.length - 1) {
            const delayMs = delayBetweenCollects ?? 2000;
            await gaussianDelay({ mean: delayMs, stdDev: delayMs * 0.25 });
          }
        }

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
            { total: urls.length, succeeded, skipped, failed, results, user: resolvedUser },
            'PARSE:results'
          );
        }
      },
      { headless }
    );
  } catch (error) {
    debugLog('收藏出错:', error);
    outputFromError(error);
  }
}
