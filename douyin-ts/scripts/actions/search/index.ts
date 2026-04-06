/**
 * Search actions
 *
 * @module actions/search
 * @description Search functionality for Douyin
 */

import type { Page } from 'playwright';
import type { UserName } from '../../user/types';
import { withSession, type SessionContext } from '../shared/session';
import { outputSuccess, outputError } from '../../core/utils/output';
import { DouyinErrorCode } from '../../core/error';
import { debugLog, delay } from '../../core/utils';
import { SEARCH_SELECTORS, SEARCH_URLS } from '../interact/selectors';

// ============================================
// Types
// ============================================

export type VideoSortTypeValue = 'comprehensive' | 'most-likes' | 'latest';
export type PublishTimeValue = 'unlimited' | 'one-day' | 'one-week' | 'six-months';

export const VideoSortType = {
  COMPREHENSIVE: 'comprehensive',
  MOST_LIKES: 'most-likes',
  LATEST: 'latest',
} as const;

export const PublishTimeType = {
  UNLIMITED: 'unlimited',
  ONE_DAY: 'one-day',
  ONE_WEEK: 'one-week',
  SIX_MONTHS: 'six-months',
} as const;

export interface VideoSearchOptions {
  keyword: string;
  sortType?: VideoSortTypeValue;
  publishTime?: PublishTimeValue;
  limit?: number;
  headless?: boolean;
  user?: UserName;
}

export interface VideoSearchResult {
  url: string;
  videoId: string;
  title: string;
  author: string;
  likes: string;
  duration?: string;
  timeAgo?: string;
  coverUrl?: string;
}

export interface UserSearchOptions {
  keyword: string;
  limit?: number;
  headless?: boolean;
  user?: UserName;
}

export interface UserSearchResult {
  url: string;
  userId: string;
  nickname: string;
  signature?: string;
  verified?: boolean;
  avatarUrl?: string;
}

// ============================================
// Search Video Implementation
// ============================================

export async function executeSearchVideo(options: VideoSearchOptions): Promise<void> {
  const {
    keyword,
    sortType = 'comprehensive',
    publishTime = 'unlimited',
    limit = 10,
    headless = false,
    user,
  } = options;

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;

        // Build search URL
        const searchUrl = SEARCH_URLS.build(keyword);
        debugLog('Searching for:', keyword, 'at', searchUrl);

        // Navigate to search page
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(2000);

        // Wait for results
        await page.waitForSelector(SEARCH_SELECTORS.container, { timeout: 10000 }).catch(() => {});

        // Extract video results
        const cards = await page.locator(SEARCH_SELECTORS.videoCard).all();
        const results: VideoSearchResult[] = [];

        for (let i = 0; i < Math.min(cards.length, limit); i++) {
          const card = cards[i];

          const url = await card.locator(SEARCH_SELECTORS.videoLink).first().getAttribute('href').catch(() => null);
          const title = await card.locator(SEARCH_SELECTORS.videoTitle).first().textContent().catch(() => '');
          const author = await card.locator(SEARCH_SELECTORS.videoAuthor).first().textContent().catch(() => '');
          const likes = await card.locator(SEARCH_SELECTORS.likeCount).first().textContent().catch(() => '');
          const timeAgo = await card.locator(SEARCH_SELECTORS.timeAgo).first().textContent().catch(() => '');
          const duration = await card.locator(SEARCH_SELECTORS.duration).first().textContent().catch(() => '');
          const coverUrl = await card.locator(SEARCH_SELECTORS.coverImage).first().getAttribute('src').catch(() => null);

          if (url) {
            const videoId = url.match(/video\/(\d+)/)?.[1] || '';
            results.push({
              url: url.startsWith('http') ? url : `https://www.douyin.com${url}`,
              videoId,
              title: title?.trim() || '',
              author: author?.trim() || '',
              likes: likes?.trim() || '',
              duration: duration?.trim(),
              timeAgo: timeAgo?.trim(),
              coverUrl: coverUrl || undefined,
            });
          }
        }

        outputSuccess({ keyword, results, total: results.length }, 'PARSE:search-video-results');
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
// Search User Implementation
// ============================================

export async function executeSearchUser(options: UserSearchOptions): Promise<void> {
  const { keyword, limit = 10, headless = false, user } = options;

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;

        // Build search URL with user type
        const searchUrl = SEARCH_URLS.build(keyword) + '?type=user';
        debugLog('Searching for users:', keyword, 'at', searchUrl);

        // Navigate to search page
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await delay(2000);

        // Wait for results
        await page.waitForSelector(SEARCH_SELECTORS.container, { timeout: 10000 }).catch(() => {});

        // Extract user results
        const cards = await page.locator(SEARCH_SELECTORS.userCard).all();
        const results: UserSearchResult[] = [];

        for (let i = 0; i < Math.min(cards.length, limit); i++) {
          const card = cards[i];

          const url = await card.locator(SEARCH_SELECTORS.userLink).first().getAttribute('href').catch(() => null);
          const nickname = await card.locator(SEARCH_SELECTORS.userNickname).first().textContent().catch(() => '');

          if (url) {
            const userId = url.match(/user\/([^?/]+)/)?.[1] || '';
            results.push({
              url: url.startsWith('http') ? url : `https://www.douyin.com${url}`,
              userId,
              nickname: nickname?.trim() || '',
            });
          }
        }

        outputSuccess({ keyword, results, total: results.length }, 'PARSE:search-user-results');
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