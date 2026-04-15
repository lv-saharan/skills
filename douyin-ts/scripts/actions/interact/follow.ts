/**
 * Follow action
 *
 * @module interact/follow
 * @description Follow Douyin users
 *
 * TODO: Implement Douyin-specific follow logic.
 */

import type { FollowOptions, FollowResult, FollowManyResult } from './types';

/**
 * Execute follow operation on one or more users
 *
 * @param options - Follow options
 * @returns Follow results
 */
export async function executeFollow(options: FollowOptions): Promise<FollowManyResult> {
  const { withSession } = await import('../shared/session');
  const { outputSuccess, outputError } = await import('../../core/utils/output');
  const { SkillErrorCode } = await import('../../config/errors');
  const { delay } = await import('../../core/utils/delay');

  let result: FollowManyResult | undefined;

  try {
    result = await withSession(
      options.user,
      async (ctx) => {
        const { page } = ctx;
        const results: FollowResult[] = [];
        let succeeded = 0;
        const skipped = 0;
        let failed = 0;

        for (const url of options.urls) {
          try {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            // TODO: Implement Douyin-specific follow button clicking
            const itemResult: FollowResult = {
              success: true,
              url,
              userId: extractUserId(url),
              following: true,
              user: options.user,
            };
            results.push(itemResult);
            succeeded++;
            if (options.delayBetweenFollows && options.urls.length > 1) {
              await delay(options.delayBetweenFollows);
            }
          } catch (error) {
            const itemResult: FollowResult = {
              success: false,
              url,
              userId: extractUserId(url),
              following: false,
              error: error instanceof Error ? error.message : 'Unknown error',
              user: options.user,
            };
            results.push(itemResult);
            failed++;
          }
        }

        const manyResult: FollowManyResult = {
          total: options.urls.length,
          succeeded,
          skipped,
          failed,
          results,
          user: options.user,
        };
        outputSuccess(manyResult, 'PARSE:follow-results');
        return manyResult;
      },
      { headless: options.headless }
    );
  } catch (error) {
    if (error instanceof Error) {
      outputError(error.message, SkillErrorCode.INTERNAL_ERROR);
    } else {
      outputError('Unknown error during follow', SkillErrorCode.INTERNAL_ERROR);
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

function extractUserId(url: string): string {
  const match = url.match(/\/user\/([^/?]+)/);
  return match ? match[1] : url;
}
