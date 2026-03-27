/**
 * User profile scraping functionality
 *
 * @module scrape/user
 * @description Scrape user profile information from Xiaohongshu
 */

import type { Page } from 'playwright';
import type { ScrapeUserOptions, ScrapeUserResult, UserIdExtraction } from './types';
import { USER_SELECTORS, ERROR_SELECTORS } from './selectors';
import { TIMEOUTS } from '../shared';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { config, debugLog, delay, XHS_URLS } from '../utils/helpers';
import { checkCaptcha, checkLoginStatus, simulateReading, humanScroll } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';

// ============================================
// Constants
// ============================================

const PAGE_LOAD_TIMEOUT = 20000;
const DEFAULT_MAX_NOTES = 12;
const MAX_NOTES = 50;
const NOTES_PER_SCROLL = 12;

// ============================================
// URL Parsing
// ============================================

/**
 * Extract user ID from URL
 * Supports:
 * - https://www.xiaohongshu.com/user/profile/{userId}
 */
export function extractUserIdFromUrl(url: string): UserIdExtraction {
  try {
    const urlObj = new URL(url);

    // Short links not supported
    if (urlObj.hostname === 'xhslink.com') {
      return { success: false, error: '短链接不支持，请使用完整URL' };
    }

    if (urlObj.hostname.includes('xiaohongshu.com')) {
      // Pattern: /user/profile/{userId}
      const match = urlObj.pathname.match(/\/user\/profile\/([a-zA-Z0-9]+)/);
      if (match && match[1].length >= 20) {
        return { success: true, userId: match[1] };
      }
    }

    return { success: false, error: '无法从URL提取用户ID，请检查URL格式' };
  } catch {
    return { success: false, error: 'URL格式无效' };
  }
}

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
 * Check for error states on the page
 */
async function checkPageErrors(page: Page): Promise<string | null> {
  const content = await page.content();

  if (content.includes('页面不见了') || content.includes('用户不存在')) {
    return '用户不存在';
  }
  if (content.includes('该用户已设为私密')) {
    return '该用户账号已设为私密';
  }
  if (content.includes('账号已封禁') || content.includes('该用户已被封禁')) {
    return '该用户账号已被封禁';
  }

  // Check for error selectors
  for (const sel of Object.values(ERROR_SELECTORS)) {
    const isVisible = await page
      .locator(sel)
      .first()
      .isVisible()
      .catch(() => false);
    if (isVisible) {
      return '页面出现错误';
    }
  }

  return null;
}

/**
 * Load more notes by scrolling
 */
async function loadMoreNotes(page: Page, targetCount: number): Promise<void> {
  const itemSelector = USER_SELECTORS.noteItem;

  let scrollCount = 0;
  const maxScrolls = Math.ceil(targetCount / NOTES_PER_SCROLL) + 2;

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
    // 1. Navigate to page
    debugLog('导航到: ' + url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUTS.PAGE_LOAD });
    await page.waitForLoadState('networkidle', { timeout: PAGE_LOAD_TIMEOUT }).catch(() => {});
    await delay(1500 + Math.random() * 1000);

    // 2. Check for errors
    if (await checkCaptcha(page)) {
      return {
        success: false,
        userId,
        url,
        error: '检测到验证码',
        name: '',
        stats: { follows: 0, fans: 0, liked: 0, notes: 0 },
        scrapedAt: new Date().toISOString(),
      };
    }

    const pageError = await checkPageErrors(page);
    if (pageError) {
      return {
        success: false,
        userId,
        url,
        error: pageError,
        name: '',
        stats: { follows: 0, fans: 0, liked: 0, notes: 0 },
        scrapedAt: new Date().toISOString(),
      };
    }

    // 3. Simulate human browsing
    await simulateReading(page);

    // 4. Load more notes if needed
    if (options.includeNotes && options.maxNotes > NOTES_PER_SCROLL) {
      await loadMoreNotes(page, options.maxNotes);
    }

    // 5. Hover on note items to get xsec_token
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

    // 6. Extract data
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

  await withSession(
    async (session) => {
      // Load and validate cookies
      const cookies = await loadCookies(user);
      validateCookies(cookies);
      await session.context.addCookies(cookies);

      // Navigate to home first to establish session
      await session.page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
      await delay(2000);

      // Check login status (optional for public profiles)
      const isLoggedIn = await checkLoginStatus(session.page);
      if (!isLoggedIn) {
        debugLog('未登录，可能无法查看完整用户信息');
      }

      // Scrape the user
      const result = await scrapeUser(session.page, url, { includeNotes, maxNotes });
      result.user = user;

      // Output result
      if (!result.success && result.error) {
        outputSuccess(result, 'RELAY:' + result.error);
      } else {
        outputSuccess(result, 'PARSE:user');
      }
    },
    { headless: headless ?? config.headless }
  ).catch((error) => {
    debugLog('抓取用户出错:', error);
    outputFromError(error);
  });
}
