/**
 * Interact actions
 *
 * @module actions/interact
 * @description Interaction functionality (like, collect, follow) for Douyin
 */

import type { Page } from 'playwright';
import type { UserName } from '../../user/types';
import { withSession, type SessionContext, executeBatch } from '../shared/session';
import { outputSuccess, outputError } from '../../core/utils/output';
import { DouyinErrorCode } from '../../core/error';
import { debugLog, delay } from '../../core/utils';
import { NOTE_SELECTORS, LIKE_SELECTORS, COLLECT_SELECTORS, FOLLOW_SELECTORS } from './selectors';

// ============================================
// Types
// ============================================

export interface LikeOptions {
  urls: string[];
  headless?: boolean;
  user?: UserName;
  delayBetweenLikes?: number;
}

export interface LikeResult {
  url: string;
  success: boolean;
  message?: string;
}

export interface CollectOptions {
  urls: string[];
  headless?: boolean;
  user?: UserName;
  delayBetweenCollects?: number;
}

export interface FollowOptions {
  urls: string[];
  headless?: boolean;
  user?: UserName;
  delayBetweenFollows?: number;
}

// ============================================
// URL Utilities
// ============================================

/**
 * Extract note ID from Douyin URL
 */
export function extractNoteId(url: string): { noteId: string } | null {
  const match = url.match(/video\/(\d+)/);
  if (match) {
    return { noteId: match[1] };
  }
  return null;
}

/**
 * Extract user ID from Douyin URL
 */
export function extractUserId(url: string): { userId: string } | null {
  const match = url.match(/user\/([^?/]+)/);
  if (match) {
    return { userId: match[1] };
  }
  return null;
}

// ============================================
// Like Implementation
// ============================================

export async function executeLike(options: LikeOptions): Promise<void> {
  const { urls, headless = false, user, delayBetweenLikes = 2000 } = options;

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;

        const results = await executeBatch(
          urls,
          async (url: string) => {
            const noteId = extractNoteId(url);
            if (!noteId) {
              return { url, success: false, message: 'Invalid URL' };
            }

            // Navigate to video page
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await delay(2000);

            // Click like button
            const likeButton = page.locator(LIKE_SELECTORS.button).first();
            const clicked = await likeButton.click().then(() => true).catch(() => false);

            if (clicked) {
              await delay(delayBetweenLikes);
            }

            return { url, success: clicked };
          },
          { delayBetween: delayBetweenLikes }
        );

        outputSuccess({ results }, 'PARSE:like-results');
      },
      { headless }
    );
  } catch (error) {
    if (error instanceof Error) {
      outputError(error.message, DouyinErrorCode.INTERNAL_ERROR);
    } else {
      outputError(String(error), DouyinErrorCode.INTERNAL_ERROR);
    }
  }
}

// ============================================
// Collect Implementation
// ============================================

export async function executeCollect(options: CollectOptions): Promise<void> {
  const { urls, headless = false, user, delayBetweenCollects = 2000 } = options;

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;

        const results = await executeBatch(
          urls,
          async (url: string) => {
            const noteId = extractNoteId(url);
            if (!noteId) {
              return { url, success: false, message: 'Invalid URL' };
            }

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await delay(2000);

            const collectButton = page.locator(COLLECT_SELECTORS.button).first();
            const clicked = await collectButton.click().then(() => true).catch(() => false);

            if (clicked) {
              await delay(delayBetweenCollects);
            }

            return { url, success: clicked };
          },
          { delayBetween: delayBetweenCollects }
        );

        outputSuccess({ results }, 'PARSE:collect-results');
      },
      { headless }
    );
  } catch (error) {
    if (error instanceof Error) {
      outputError(error.message, DouyinErrorCode.INTERNAL_ERROR);
    } else {
      outputError(String(error), DouyinErrorCode.INTERNAL_ERROR);
    }
  }
}

// ============================================
// Follow Implementation
// ============================================

export async function executeFollow(options: FollowOptions): Promise<void> {
  const { urls, headless = false, user, delayBetweenFollows = 2000 } = options;

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;

        const results = await executeBatch(
          urls,
          async (url: string) => {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await delay(2000);

            const followButton = page.locator(FOLLOW_SELECTORS.button).first();
            const clicked = await followButton.click().then(() => true).catch(() => false);

            if (clicked) {
              await delay(delayBetweenFollows);
            }

            return { url, success: clicked };
          },
          { delayBetween: delayBetweenFollows }
        );

        outputSuccess({ results }, 'PARSE:follow-results');
      },
      { headless }
    );
  } catch (error) {
    if (error instanceof Error) {
      outputError(error.message, DouyinErrorCode.INTERNAL_ERROR);
    } else {
      outputError(String(error), DouyinErrorCode.INTERNAL_ERROR);
    }
  }
}