/**
 * Collect action
 *
 * @module interact/collect
 * @description Collect (bookmark) Douyin videos
 *
 * TODO: Implement Douyin-specific collect logic.
 */

import type { CollectOptions, CollectResult, CollectManyResult } from './types';

/**
 * Execute collect operation on one or more videos
 *
 * @param options - Collect options
 * @returns Collect results
 */
export async function executeCollect(options: CollectOptions): Promise<CollectManyResult> {
  const { withSession } = await import('../shared/session');
  const { outputSuccess, outputError } = await import('../../core/utils/output');
  const { SkillErrorCode } = await import('../../config/errors');
  const { delay } = await import('../../core/utils/delay');

  let result: CollectManyResult | undefined;

  try {
    result = await withSession(
      options.user,
      async (ctx) => {
        const { page } = ctx;
        const results: CollectResult[] = [];
        let succeeded = 0;
        const skipped = 0;
        let failed = 0;

        for (const url of options.urls) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // TODO: Implement Douyin-specific collect button clicking
            const itemResult: CollectResult = {
              success: true,
              url,
              noteId: extractVideoId(url),
              collected: true,
              user: options.user,
            };
            results.push(itemResult);
            succeeded++;
            if (options.delayBetweenCollects && options.urls.length > 1) {
              await delay(options.delayBetweenCollects);
            }
          } catch (error) {
            const itemResult: CollectResult = {
              success: false,
              url,
              noteId: extractVideoId(url),
              collected: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              user: options.user,
            };
            results.push(itemResult);
            failed++;
          }
        }

        const manyResult: CollectManyResult = {
          total: options.urls.length,
          succeeded,
          skipped,
          failed,
          results,
          user: options.user,
        };
        outputSuccess(manyResult, 'PARSE:collect-results');
        return manyResult;
      },
      { headless: options.headless }
    );
  } catch (error) {
    if (error instanceof Error) {
      outputError(error.message, SkillErrorCode.INTERNAL_ERROR);
    } else {
      outputError('Unknown error during collect', SkillErrorCode.INTERNAL_ERROR);
    }
    throw error;
  }

  return (
    result ?? {
      total: options.urls.length,
      succeeded: 0,
      skipped: 0,
      failed: options.urls.length,
      results: [],
      user: options.user,
    }
  );
}

function extractVideoId(url: string): string {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : url;
}
