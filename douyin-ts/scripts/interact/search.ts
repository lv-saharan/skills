/**
 * Search functionality implementation
 *
 * @module interact/search
 * @description Search for videos and users on Douyin with infinite scroll pagination
 */

import type { Page } from 'playwright';
import type {
  SearchOptions,
  SearchOperationResult,
  SearchResult,
  VideoSearchResult,
  UserSearchResult,
} from './types';
import { SEARCH_SELECTORS, SEARCH_URLS } from './selectors';
import { withAuthenticatedAction, INTERACTION_DELAYS } from './shared';
import { delay, randomDelay, debugLog } from '../utils/helpers';
import { outputSuccess, outputFromError } from '../utils/output';
import { DouyinError, DouyinErrorCode } from '../shared';

// ============================================
// Constants
// ============================================

const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;
const SCROLL_DELAY = 1500;
const MAX_SCROLL_ATTEMPTS = 20;
const PAGE_LOAD_TIMEOUT = 30000;

// ============================================
// Video Card Extraction
// ============================================

/**
 * Extract video data from a video card element
 */
async function extractVideoCard(page: Page, card: any): Promise<VideoSearchResult | null> {
  try {
    return await card.evaluate((el: Element) => {
      // Find video link
      const linkEl = el.querySelector('a[href*="/video/"]');
      if (!linkEl) return null;

      const href = linkEl.getAttribute('href') || '';
      const videoMatch = href.match(/\/video\/([a-zA-Z0-9]+)/);
      if (!videoMatch) return null;

      const videoId = videoMatch[1];
      const url = href.startsWith('http') ? href : `https://www.douyin.com${href}`;

      // Extract title/description
      const titleEl = el.querySelector('[class*="title"], [class*="desc"], [class*="description"]');
      const title = titleEl?.textContent?.trim() || '';

      // Extract author
      const authorEl = el.querySelector('[class*="author"], [class*="nickname"], [class*="userName"]');
      const author = authorEl?.textContent?.trim() || '';

      // Extract author URL
      const authorLinkEl = el.querySelector('a[href*="/user/"]');
      const authorUrl = authorLinkEl?.getAttribute('href') || undefined;
      const fullAuthorUrl = authorUrl
        ? authorUrl.startsWith('http')
          ? authorUrl
          : `https://www.douyin.com${authorUrl}`
        : undefined;

      // Extract stats
      const statsEl = el.querySelector('[class*="stats"], [class*="interact"]');
      let likes: number | undefined;
      let comments: number | undefined;

      if (statsEl) {
        const likeEl = statsEl.querySelector('[class*="like"], [class*="digg"]');
        const likeText = likeEl?.textContent?.trim() || '';
        likes = parseCount(likeText);

        const commentEl = statsEl.querySelector('[class*="comment"]');
        const commentText = commentEl?.textContent?.trim() || '';
        comments = parseCount(commentText);
      }

      // Extract cover image
      const imgEl = el.querySelector('img[class*="cover"], img[class*="poster"], img');
      const coverUrl = imgEl?.getAttribute('src') || undefined;

      return {
        type: 'video' as const,
        url,
        videoId,
        title,
        author,
        authorUrl: fullAuthorUrl,
        likes,
        comments,
        coverUrl,
      };
    });
  } catch (error) {
    debugLog('Error extracting video card:', error);
    return null;
  }
}

// ============================================
// User Card Extraction
// ============================================

/**
 * Extract user data from a user card element
 */
async function extractUserCard(page: Page, card: any): Promise<UserSearchResult | null> {
  try {
    return await card.evaluate((el: Element) => {
      // Find user link
      const linkEl = el.querySelector('a[href*="/user/"]');
      if (!linkEl) return null;

      const href = linkEl.getAttribute('href') || '';
      const userMatch = href.match(/\/user\/([a-zA-Z0-9]+)/);
      if (!userMatch) return null;

      const userId = userMatch[1];
      const url = href.startsWith('http') ? href : `https://www.douyin.com${href}`;

      // Extract nickname
      const nicknameEl = el.querySelector(
        '[class*="nickname"], [class*="userName"], [class*="user-nickname"]'
      );
      const nickname = nicknameEl?.textContent?.trim() || '';

      // Extract signature
      const sigEl = el.querySelector('[class*="signature"], [class*="bio"], [class*="desc"]');
      const signature = sigEl?.textContent?.trim() || undefined;

      // Extract follower count
      const followerEl = el.querySelector('[class*="follower"], [class*="fans"]');
      const followerText = followerEl?.textContent?.trim() || '';
      const followers = parseCount(followerText);

      // Extract avatar
      const avatarEl = el.querySelector('img[class*="avatar"], img');
      const avatarUrl = avatarEl?.getAttribute('src') || undefined;

      // Check verified status
      const verifiedEl = el.querySelector('[class*="verified"], [class*="auth"]');
      const verified = verifiedEl !== null;

      return {
        type: 'user' as const,
        url,
        userId,
        nickname,
        signature,
        followers,
        avatarUrl,
        verified,
      };
    });
  } catch (error) {
    debugLog('Error extracting user card:', error);
    return null;
  }
}

// ============================================
// Helper Functions
// ============================================

/**
 * Parse count string like "1.2万" or "1234" to number
 */
function parseCount(text: string): number | undefined {
  if (!text) return undefined;

  // Remove non-numeric characters except decimal point and Chinese characters
  const cleaned = text.replace(/[^\d.万千百万亿w]/gi, '');

  if (!cleaned) return undefined;

  try {
    let num: number;
    if (cleaned.includes('万') || cleaned.toLowerCase().includes('w')) {
      num = parseFloat(cleaned.replace(/[万千百万亿w]/gi, '')) * 10000;
    } else if (cleaned.includes('亿')) {
      num = parseFloat(cleaned.replace(/[万千百万亿]/gi, '')) * 100000000;
    } else {
      num = parseFloat(cleaned);
    }
    return isNaN(num) ? undefined : Math.floor(num);
  } catch {
    return undefined;
  }
}

/**
 * Scroll down to load more content
 */
async function scrollForMore(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await delay(SCROLL_DELAY + Math.random() * 500);
}

/**
 * Check if we've reached the end of scrollable content
 */
async function hasReachedEnd(page: Page, previousHeight: number): Promise<boolean> {
  const currentHeight = await page.evaluate(() => document.body.scrollHeight);
  return currentHeight === previousHeight;
}

// ============================================
// Core Search Logic
// ============================================

/**
 * Perform search operation with infinite scroll
 */
async function performSearch(page: Page, options: SearchOptions): Promise<SearchOperationResult> {
  const { keyword, type = 'general', limit = DEFAULT_LIMIT } = options;

  debugLog(`Searching for "${keyword}" with type="${type}", limit=${limit}`);

  // Build search URL
  const searchUrl = SEARCH_URLS.build(keyword, type);
  debugLog(`Search URL: ${searchUrl}`);

  // Navigate to search page
  await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: PAGE_LOAD_TIMEOUT });
  await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
  await randomDelay(INTERACTION_DELAYS.afterNavigation.min, INTERACTION_DELAYS.afterNavigation.max);

  // Check for errors
  const pageContent = await page.content();
  if (pageContent.includes('页面不存在') || pageContent.includes('找不到')) {
    return {
      success: false,
      keyword,
      type,
      total: 0,
      results: [],
      error: '搜索页面加载失败',
    };
  }

  // Collect results with infinite scroll
  const results: SearchResult[] = [];
  const seenIds = new Set<string>();
  let scrollAttempts = 0;
  let previousHeight = 0;

  while (results.length < limit && scrollAttempts < MAX_SCROLL_ATTEMPTS) {
    // Get current scroll height
    previousHeight = await page.evaluate(() => document.body.scrollHeight);

    // Extract video cards
    if (type === 'general' || type === 'video') {
      const videoCards = await page.locator(SEARCH_SELECTORS.videoCard).all();
      debugLog(`Found ${videoCards.length} video cards`);

      for (const card of videoCards) {
        if (results.length >= limit) break;

        const videoData = await extractVideoCard(page, card);
        if (videoData && !seenIds.has(videoData.videoId)) {
          seenIds.add(videoData.videoId);
          results.push(videoData);
        }
      }
    }

    // Extract user cards
    if (type === 'general' || type === 'user') {
      const userCards = await page.locator(SEARCH_SELECTORS.userCard).all();
      debugLog(`Found ${userCards.length} user cards`);

      for (const card of userCards) {
        if (results.length >= limit) break;

        const userData = await extractUserCard(page, card);
        if (userData && !seenIds.has(userData.userId)) {
          seenIds.add(userData.userId);
          results.push(userData);
        }
      }
    }

    // Check if we have enough results
    if (results.length >= limit) {
      break;
    }

    // Scroll for more content
    await scrollForMore(page);

    // Check if we've reached the end
    const reachedEnd = await hasReachedEnd(page, previousHeight);
    if (reachedEnd) {
      scrollAttempts++;
      debugLog(`Scroll attempt ${scrollAttempts}: no new content`);
    } else {
      scrollAttempts = 0; // Reset if new content loaded
    }
  }

  // Limit results
  const limitedResults = results.slice(0, limit);

  debugLog(`Search complete: ${limitedResults.length} results`);

  return {
    success: true,
    keyword,
    type,
    total: results.length,
    results: limitedResults,
  };
}

// ============================================
// Main Execute Function
// ============================================

/**
 * Execute search operation
 *
 * @param options - Search options
 */
export async function executeSearch(options: SearchOptions): Promise<void> {
  const { keyword, type = 'general', limit = DEFAULT_LIMIT, headless, user } = options;

  // Validate limit
  const effectiveLimit = Math.min(Math.max(1, limit), MAX_LIMIT);

  debugLog(
    `Search: keyword="${keyword}", type=${type}, limit=${effectiveLimit}, headless=${headless}, user=${user || 'default'}`
  );

  // Validate keyword
  if (!keyword || keyword.trim().length === 0) {
    outputFromError(new Error('搜索关键词不能为空'));
    return;
  }

  try {
    await withAuthenticatedAction(headless, user, async (page) => {
      const result = await performSearch(page, {
        ...options,
        limit: effectiveLimit,
      });

      if (!result.success) {
        outputSuccess(result, `RELAY:${result.error || '搜索失败'}`);
        return;
      }

      outputSuccess(
        {
          ...result,
          user,
        },
        'PARSE:search-results'
      );
    });
  } catch (error) {
    debugLog('Search error:', error);
    outputFromError(error);
  }
}

// ============================================
// Exports
// ============================================

export { SEARCH_URLS, SEARCH_SELECTORS };