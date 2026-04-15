/**
 * Like action
 *
 * @module interact/like
 * @description Like Douyin videos
 *
 * TODO: Implement Douyin-specific like logic.
 */

import type { LikeOptions, LikeResult, LikeManyResult } from './types';

/**
 * Execute like operation on one or more videos
 *
 * @param options - Like options
 * @returns Like results
 */
export async function executeLike(options: LikeOptions): Promise<LikeManyResult> {
  const { withSession } = await import('../shared/session');
  const { outputSuccess, outputError } = await import('../../core/utils/output');
  const { SkillErrorCode } = await import('../../config/errors');
  const { delay } = await import('../../core/utils/delay');

  let result: LikeManyResult | undefined;

  try {
    result = await withSession(
      options.user,
      async (ctx) => {
        const { page } = ctx;
        const results: LikeResult[] = [];
        let succeeded = 0;
        const skipped = 0;
        let failed = 0;

        for (const url of options.urls) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // TODO: Implement Douyin-specific like button clicking
            const itemResult: LikeResult = {
              success: true,
              url,
              noteId: extractVideoId(url),
              liked: true,
              user: options.user,
            };
            results.push(itemResult);
            succeeded++;
            if (options.delayBetweenLikes && options.urls.length > 1) {
              await delay(options.delayBetweenLikes);
            }
          } catch (error) {
            const itemResult: LikeResult = {
              success: false,
              url,
              noteId: extractVideoId(url),
              liked: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              user: options.user,
            };
            results.push(itemResult);
            failed++;
          }
        }

        const manyResult: LikeManyResult = {
          total: options.urls.length,
          succeeded,
          skipped,
          failed,
          results,
          user: options.user,
        };
        outputSuccess(manyResult, 'PARSE:like-results');
        return manyResult;
      },
      { headless: options.headless }
    );
  } catch (error) {
    if (error instanceof Error) {
      outputError(error.message, SkillErrorCode.INTERNAL_ERROR);
    } else {
      outputError('Unknown error during like', SkillErrorCode.INTERNAL_ERROR);
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
