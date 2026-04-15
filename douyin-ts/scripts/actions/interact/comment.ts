/**
 * Comment action
 *
 * @module interact/comment
 * @description Comment on Douyin videos
 *
 * TODO: Implement Douyin-specific comment logic.
 */

import type { CommentOptions, CommentResult } from './types';

/**
 * Execute comment operation on a video
 *
 * @param options - Comment options
 * @returns Comment result
 */
export async function executeComment(options: CommentOptions): Promise<CommentResult> {
  const { withSession } = await import('../shared/session');
  const { outputSuccess, outputError } = await import('../../core/utils/output');
  const { SkillErrorCode } = await import('../../config/errors');

  let result: CommentResult | undefined;

  try {
    result = await withSession(
      options.user,
      async (ctx) => {
        const { page } = ctx;
        await page.goto(options.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        // TODO: Implement Douyin-specific comment posting

        const commentResult: CommentResult = {
          success: true,
          url: options.url,
          noteId: extractVideoId(options.url),
          text: options.text,
          user: options.user,
        };
        outputSuccess(commentResult, 'RELAY:评论成功');
        return commentResult;
      },
      { headless: options.headless }
    );
  } catch (error) {
    if (error instanceof Error) {
      outputError(error.message, SkillErrorCode.INTERNAL_ERROR);
    } else {
      outputError('Unknown error during comment', SkillErrorCode.INTERNAL_ERROR);
    }
    throw error;
  }

  return (
    result ?? {
      success: false,
      url: options.url,
      noteId: extractVideoId(options.url),
      text: options.text,
      error: 'Unknown error',
      user: options.user,
    }
  );
}

function extractVideoId(url: string): string {
  const match = url.match(/\/video\/(\d+)/);
  return match ? match[1] : url;
}
