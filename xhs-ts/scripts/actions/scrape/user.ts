/**
 * User profile scraping functionality
 *
 * @module actions/scrape/user
 * @description Scrape user profile information from Xiaohongshu
 */

import type { Page } from 'playwright';
import type { ScrapeUserOptions, ScrapeUserResult } from './types';
import type { UserName } from '../../user';
import { extractUserIdFromUrl } from '../shared/url-utils';
import { USER_SELECTORS } from '../shared/selectors';
import { withSession, type SessionContext } from '../shared/session';
import { preparePageForAction, checkContentErrors } from '../shared/page-prep';
import { debugLog, delay, outputSuccess, outputFromError } from '../../core/utils';
import { humanScroll } from '../../core/anti-detect';

// ============================================
// Constants
// ============================================

const DEFAULT_MAX_NOTES = 12;
const MAX_NOTES = 50;
const USER_NOTES_PER_SCROLL = 12;

// ============================================
// Data Extraction
// ============================================

/**
 * Extract user profile data from the page
 */
async function extractUserData(
  page: Page,
  options: { includeNotes: boolean; maxNotes: number }
): Promise<Partial<ScrapeUserResult>> {
  const { includeNotes, maxNotes } = options;

  return page.evaluate(
    ({ selectors, includeNotes, maxNotes }) => {
      // Helper to get text content
      const getText = (sel: string): string => {
        for (const s of sel.split(', ')) {
          const el = document.querySelector(s);
          if (el?.textContent?.trim()) {
            return el.textContent.trim();
          }
        }
        return '';
      };

      // Helper to get attribute
      const getAttr = (sel: string, attr: string): string => {
        for (const s of sel.split(', ')) {
          const el = document.querySelector(s);
          if (el?.getAttribute(attr)) {
            return el.getAttribute(attr) || '';
          }
        }
        return '';
      };

      // Parse count from text
      const parseCountLocal = (text: string | null | undefined): number => {
        if (!text) {
          return 0;
        }
        const t = String(text).trim();
        if (!t) {
          return 0;
        }
        if (t.includes('万')) {
          return Math.floor(parseFloat(t) * 10000);
        }
        if (t.includes('w') || t.includes('W')) {
          return Math.floor(parseFloat(t) * 10000);
        }
        return parseInt(t.replace(/[^0-9]/g, ''), 10) || 0;
      };

      // Extract basic profile
      const name = getText(selectors.name) || '未知用户';
      const avatar = getAttr(selectors.avatar, 'src');
      const bio = getText(selectors.bio);
      const location = getText(selectors.location);
      const redId = getText(selectors.redId);

      // Extract stats
      const statsContainer = document.querySelector(selectors.statsContainer);
      let follows = 0;
      let fans = 0;
      let liked = 0;
      let notes = 0;

      if (statsContainer) {
        const allStatText = statsContainer.textContent || '';
        const followsMatch = allStatText.match(/(\d+(?:\.\d+)?[万wW]?)\s*关注/);
        const fansMatch = allStatText.match(/(\d+(?:\.\d+)?[万wW]?)\s*粉丝/);
        const likedMatch = allStatText.match(/(\d+(?:\.\d+)?[万wW]?)\s*获赞/);

        if (followsMatch) {
          follows = parseCountLocal(followsMatch[1]);
        }
        if (fansMatch) {
          fans = parseCountLocal(fansMatch[1]);
        }
        if (likedMatch) {
          liked = parseCountLocal(likedMatch[1]);
        }
      }

      // Extract user tags
      const tags: string[] = [];
      const tagEls = document.querySelectorAll(selectors.userTag);
      tagEls.forEach((el) => {
        const text = el.textContent?.trim();
        if (text) {
          tags.push(text);
        }
      });

      // Extract recent notes if requested
      let recentNotes:
        | Array<{
            id: string;
            cover: string;
            title?: string;
            likes: number;
            url: string;
            type: 'image' | 'video';
          }>
        | undefined;

      if (includeNotes) {
        recentNotes = [];
        const noteEls = document.querySelectorAll(selectors.noteItem);

        for (let i = 0; i < Math.min(noteEls.length, maxNotes); i++) {
          const el = noteEls[i];

          // Get cover image
          const imgEl = el.querySelector(selectors.noteCover);
          const cover = imgEl?.getAttribute('src') || '';

          // Get title
          const titleEl = el.querySelector(selectors.noteTitle);
          const title = titleEl?.textContent?.trim() || undefined;

          // Get likes
          const likesEl = el.querySelector(selectors.noteLikes);
          const likes = parseCountLocal(likesEl?.textContent);

          // Get note URL and ID
          const linkEl = el.querySelector(selectors.noteLink);
          const href = linkEl?.getAttribute('href') || '';
          let noteId = '';
          let xsecToken = '';

          if (href.includes('/explore/')) {
            const idMatch = href.match(/\/explore\/([a-zA-Z0-9]+)/);
            if (idMatch) {
              noteId = idMatch[1];
            }
          }
          if (href.includes('xsec_token')) {
            const tokenMatch = href.match(/xsec_token=([^&]+)/);
            if (tokenMatch) {
              xsecToken = tokenMatch[1];
            }
          }

          // Check if video
          const hasVideo = el.querySelector(selectors.videoIndicator) !== null;
          const type: 'image' | 'video' = hasVideo ? 'video' : 'image';

          // Build URL
          const noteUrl = noteId
            ? xsecToken
              ? `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${xsecToken}&xsec_source=pc_user`
              : `https://www.xiaohongshu.com/explore/${noteId}`
            : '';

          if (noteId && cover) {
            recentNotes.push({
              id: noteId,
              cover,
              title,
              likes,
              url: noteUrl,
              type,
            });
          }
        }

        // Update notes count from actual grid
        notes = recentNotes.length > 0 ? recentNotes.length : notes;
      }

      return {
        name,
        avatar: avatar || undefined,
        bio: bio || undefined,
        location: location || undefined,
        redId: redId || undefined,
        stats: { follows, fans, liked, notes },
        tags: tags.length > 0 ? tags : undefined,
        recentNotes,
      };
    },
    {
      selectors: USER_SELECTORS,
      includeNotes,
      maxNotes,
    }
  );
}

/**
 * Load more notes by scrolling
 */
async function loadMoreNotes(page: Page, targetCount: number): Promise<void> {
  const itemSelector = USER_SELECTORS.noteItem;

  let scrollCount = 0;
  const maxScrolls = Math.ceil(targetCount / USER_NOTES_PER_SCROLL) + 2;

  while (scrollCount < maxScrolls) {
    const currentCount = await page
      .locator(itemSelector)
      .count()
      .catch(() => 0);

    if (currentCount >= targetCount) {
      debugLog(`已加载足够笔记: ${currentCount}`);
      break;
    }

    debugLog(`滚动加载更多笔记 (当前: ${currentCount}, 目标: ${targetCount})`);
    await humanScroll(page, { distance: 500 });
    await delay(1000 + Math.random() * 1000);

    scrollCount++;
  }
}

// ============================================
// Main Scrape Function
// ============================================

/**
 * Scrape user profile from URL
 */
async function scrapeUser(
  page: Page,
  url: string,
  user: UserName,
  options: { includeNotes: boolean; maxNotes: number }
): Promise<ScrapeUserResult> {
  debugLog('开始抓取用户主页...');

  const extraction = extractUserIdFromUrl(url);
  if (!extraction.success) {
    return {
      success: false,
      userId: '',
      url,
      error: extraction.error,
      name: '',
      stats: { follows: 0, fans: 0, liked: 0, notes: 0 },
      scrapedAt: new Date().toISOString(),
    };
  }

  const userId = extraction.userId!;

  try {
    // 1. Prepare page using unified API
    debugLog('Preparing page for scraping...');
    const prep = await preparePageForAction(page, url, user);

    if (!prep.success) {
      return createErrorResult(userId, url, prep.error || '页面准备失败');
    }

    // 2. Check for content-specific errors
    const contentError = await checkContentErrors(page, 'user');
    if (contentError) {
      return createErrorResult(userId, url, contentError);
    }

    // 3. Load more notes if needed
    if (options.includeNotes && options.maxNotes > USER_NOTES_PER_SCROLL) {
      await loadMoreNotes(page, options.maxNotes);
    }

    // 4. Hover on note items to get xsec_token
    if (options.includeNotes) {
      const noteLocator = page.locator(USER_SELECTORS.noteItem);
      const count = await noteLocator.count().catch(() => 0);
      const hoverCount = Math.min(count, options.maxNotes);

      debugLog(`悬停 ${hoverCount} 个笔记以获取完整URL...`);
      for (let i = 0; i < hoverCount; i++) {
        try {
          await noteLocator.nth(i).hover({ timeout: 3000 });
          await delay(100 + Math.random() * 200);
          if ((i + 1) % 5 === 0) {
            await delay(500 + Math.random() * 500);
          }
        } catch {
          // Ignore hover errors
        }
      }
    }

    // 5. Extract data
    debugLog('提取用户数据...');
    const data = await extractUserData(page, options);

    return {
      success: true,
      userId,
      url,
      ...data,
      scrapedAt: new Date().toISOString(),
    } as ScrapeUserResult;
  } catch (e) {
    return {
      success: false,
      userId,
      url,
      error: e instanceof Error ? e.message : '未知错误',
      name: '',
      stats: { follows: 0, fans: 0, liked: 0, notes: 0 },
      scrapedAt: new Date().toISOString(),
    };
  }
}

// ============================================

/**
 * Create error result object
 */
function createErrorResult(userId: string, url: string, error: string): ScrapeUserResult {
  return {
    success: false,
    userId,
    url,
    error,
    name: '',
    stats: { follows: 0, fans: 0, liked: 0, notes: 0 },
    scrapedAt: new Date().toISOString(),
  };
}
// Execute Function
// ============================================

/**
 * Execute scrape-user command
 */
export async function executeScrapeUser(options: ScrapeUserOptions): Promise<void> {
  const { url, headless, user, includeNotes = false, maxNotes: rawMaxNotes } = options;

  // Clamp max notes
  const maxNotes = Math.min(Math.max(1, rawMaxNotes || DEFAULT_MAX_NOTES), MAX_NOTES);

  debugLog(
    '抓取用户: url=' + url + ', user=' + (user || 'default') + ', includeNotes=' + includeNotes
  );

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;

        // Scrape the user
        const result = await scrapeUser(page, url, ctx.user, { includeNotes, maxNotes });
        result.user = ctx.user;

        // Output result
        if (!result.success && result.error) {
          outputSuccess(result, 'RELAY:' + result.error);
        } else {
          outputSuccess(result, 'PARSE:user');
        }
      },
      { headless: headless ?? false, autoCreate: true }
    );
  } catch (error) {
    debugLog('抓取用户出错:', error);
    outputFromError(error);
  }
}
