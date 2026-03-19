/**
 * Search command implementation
 *
 * @module search
 * @description Search notes by keyword with sorting options
 */

import type { Page } from 'playwright';
import type { SearchOptions, SearchResult, SearchResultNote, SearchSortType } from './types';
import { XhsError, XhsErrorCode } from './types';
import type { BrowserInstance } from './browser';
import { createBrowserInstance, closeBrowserInstance } from './browser';
import { loadCookies, validateCookies } from './cookie';
import { XHS_URLS, config, debugLog, delay, randomDelay } from './utils/helpers';
import { humanClick, humanScroll, checkCaptcha, checkLoginStatus } from './utils/anti-detect';
import { outputSuccess, outputFromError } from './utils/output';

// ============================================
// Constants
// ============================================

/** Search result container selector */
const SEARCH_CONTAINER_SELECTOR = '.feeds-container';

/** Note item selector (relative to container) */
const NOTE_ITEM_SELECTOR = '.note-item';

/** Default search limit */
const DEFAULT_SEARCH_LIMIT = 20;

/** Maximum notes to extract per scroll */
const NOTES_PER_SCROLL = 20;

/** Timeout constants */
const PAGE_LOAD_TIMEOUT = 30000;
const SELECTOR_TIMEOUT = 15000;

// ============================================
// URL Construction
// ============================================

/**
 * Build search URL with parameters
 */
function buildSearchUrl(keyword: string, _sort: SearchSortType = 'hot'): string {
  const params = new URLSearchParams({
    keyword,
    source: 'web_search_result_notes',
  });

  return `${XHS_URLS.home}/search_result?${params.toString()}`;
}

// ============================================
// Search Page Navigation
// ============================================

/**
 * Navigate to search page and wait for results
 */
async function navigateToSearch(page: Page, keyword: string, sort: SearchSortType): Promise<void> {
  const searchUrl = buildSearchUrl(keyword, sort);
  debugLog(`Navigating to search URL: ${searchUrl}`);

  await page.goto(searchUrl, {
    waitUntil: 'domcontentloaded',
    timeout: PAGE_LOAD_TIMEOUT,
  });

  // Wait for search results container
  try {
    await page.waitForSelector(SEARCH_CONTAINER_SELECTOR, { timeout: SELECTOR_TIMEOUT });
    debugLog(`Found search container: ${SEARCH_CONTAINER_SELECTOR}`);
  } catch {
    debugLog('Search container not found, waiting for page load');
    await delay(3000);
  }

  // Handle sorting if needed
  if (sort !== 'general') {
    await applySort(page, sort);
  }
}

/**
 * Apply sort type to search results
 */
async function applySort(page: Page, sort: SearchSortType): Promise<void> {
  const sortMap: Record<string, string> = {
    hot: '最热',
    time: '最新',
  };

  const sortText = sortMap[sort];
  if (!sortText) {
    return;
  }

  debugLog(`Applying sort: ${sortText}`);

  try {
    // Find and click sort button
    const sortButton = page.locator(
      `button:has-text("${sortText}"), div[role="button"]:has-text("${sortText}")`
    );
    const isVisible = await sortButton.isVisible().catch(() => false);

    if (isVisible) {
      await humanClick(
        page,
        `button:has-text("${sortText}"), div[role="button"]:has-text("${sortText}")`
      );
      await randomDelay(1500, 2500);
      debugLog(`Sort applied: ${sortText}`);
    }
  } catch (error) {
    debugLog('Failed to apply sort, using default ordering', error);
  }
}

// ============================================
// Note Extraction
// ============================================

/**
 * Extract note links by hovering on note items
 * This triggers the generation of xsec_token in URLs
 */
async function hoverNotesForTokens(page: Page, count: number): Promise<void> {
  const noteLocator = page.locator(`${SEARCH_CONTAINER_SELECTOR} ${NOTE_ITEM_SELECTOR}`);
  const elementCount = await noteLocator.count();

  if (elementCount === 0) {
    debugLog('No note elements found to hover');
    return;
  }

  debugLog(`Found ${elementCount} note elements`);

  const hoverCount = Math.min(elementCount, count);
  debugLog(`Hovering on ${hoverCount} notes to extract URLs`);

  for (let i = 0; i < hoverCount; i++) {
    try {
      await noteLocator.nth(i).hover({ timeout: 5000 });
      await randomDelay(100, 300);

      // Batch pause every 5 notes to avoid detection
      if ((i + 1) % 5 === 0) {
        debugLog(`Hovered ${i + 1}/${hoverCount} notes`);
        await randomDelay(500, 1000);
      }
    } catch (error) {
      debugLog(`Failed to hover on note ${i + 1}`, error);
    }
  }

  debugLog(`Completed hovering on ${hoverCount} notes`);
}

/**
 * Extract search results using page.evaluate with string expression
 * Uses string form to avoid __name injection by tsx compiler
 */
async function extractSearchResults(page: Page, limit: number): Promise<SearchResultNote[]> {
  debugLog('Extracting search results...');

  const noteLocator = page.locator(`${SEARCH_CONTAINER_SELECTOR} ${NOTE_ITEM_SELECTOR}`);
  const count = await noteLocator.count().catch(() => 0);
  const actualLimit = Math.min(count, limit);

  debugLog(`Found ${count} note items, extracting ${actualLimit}`);

  if (actualLimit === 0) {
    return [];
  }

  try {
    // 使用 Function 构造函数在运行时创建函数，避免 tsx 编译时注入 __name
    // tsx 会为函数注入 __name 辅助函数，与小红书页面的 __name 冲突
    const extractFn = new Function('opts', `
      const containerSel = opts.containerSel;
      const noteSel = opts.noteSel;
      const max = opts.max;
      
      const container = document.querySelector(containerSel);
      if (!container) {
        return { error: 'container_not_found', selector: containerSel };
      }

      const items = container.querySelectorAll(noteSel);
      const results = [];

      const parseCount = (text) => {
        if (!text) return 0;
        const t = String(text).trim();
        if (!t || t === '赞' || t === '收藏' || t === '评论') return 0;
        if (t.includes('万')) return Math.floor(parseFloat(t) * 10000);
        return parseInt(t.replace(/[^0-9]/g, ''), 10) || 0;
      };

      const extractInfo = (el) => {
        const links = el.querySelectorAll('a');
        let noteId = '';
        let xsecToken = '';

        for (const link of links) {
          const href = link.getAttribute('href') || '';

          if (href.includes('xsec_token') && href.includes('/search_result/')) {
            const match1 = href.match(/\\/search_result\\/([a-zA-Z0-9]+)/);
            const match2 = href.match(/xsec_token=([^&]+)/);
            if (match1?.[1] && match1[1].length >= 20) {
              noteId = match1[1];
              if (match2?.[1]) xsecToken = decodeURIComponent(match2[1]);
              break;
            }
          }

          if (href.includes('xsec_token') && href.includes('/explore/') && !noteId) {
            const match1 = href.match(/\\/explore\\/([a-zA-Z0-9]+)/);
            const match2 = href.match(/xsec_token=([^&]+)/);
            if (match1?.[1] && match1[1].length >= 20) {
              noteId = match1[1];
              if (match2?.[1]) xsecToken = decodeURIComponent(match2[1]);
              break;
            }
          }

          if (href.includes('/explore/') && !noteId) {
            const match = href.match(/\\/explore\\/([a-zA-Z0-9]+)/);
            if (match?.[1] && match[1].length >= 20) {
              noteId = match[1];
            }
          }
        }

        return { noteId, xsecToken };
      };

      for (let idx = 0; idx < items.length && idx < max; idx++) {
        const item = items[idx];
        const info = extractInfo(item);

        if (!info.noteId) continue;

        const noteUrl = info.xsecToken
          ? 'https://www.xiaohongshu.com/explore/' + info.noteId + '?xsec_token=' + encodeURIComponent(info.xsecToken) + '&xsec_source=pc_search'
          : 'https://www.xiaohongshu.com/explore/' + info.noteId;

        const titleEl = item.querySelector('[class*="title"]') || item.querySelector('[class*="content"]');
        const title = titleEl?.textContent?.trim() || ('笔记 ' + (idx + 1));

        const imgEl = item.querySelector('img');
        const cover = imgEl?.src || '';

        const authorNameEl = item.querySelector('[class*="author"]') || item.querySelector('[class*="name"]');
        const authorLinkEl = item.querySelector('a[href*="/user/profile/"]');
        const authorHref = authorLinkEl?.getAttribute('href') || '';
        const authorIdMatch = authorHref.match(/\\/user\\/profile\\/([a-zA-Z0-9]+)/);

        const likesEl = item.querySelector('[class*="like"] .count, .like-wrapper .count');
        const collectsEl = item.querySelector('[class*="collect"] .count, .collect-wrapper .count');
        const commentsEl = item.querySelector('[class*="comment"] .count, .chat-wrapper .count');

        results.push({
          id: info.noteId,
          title,
          author: {
            id: authorIdMatch?.[1] || '',
            name: authorNameEl?.textContent?.trim() || '未知作者',
            url: authorHref
          },
          stats: {
            likes: parseCount(likesEl?.textContent),
            collects: parseCount(collectsEl?.textContent),
            comments: parseCount(commentsEl?.textContent)
          },
          cover,
          url: noteUrl,
          xsecToken: info.xsecToken
        });
      }

      return { error: null, count: items.length, results };
    `);

    const rawData = await page.evaluate(extractFn as Parameters<typeof page.evaluate>[0], {
      containerSel: SEARCH_CONTAINER_SELECTOR,
      noteSel: NOTE_ITEM_SELECTOR,
      max: actualLimit
    });

    if (rawData && typeof rawData === 'object' && 'error' in rawData) {
      if (rawData.error) {
        debugLog(
          `Extract error: ${rawData.error}, selector: ${(rawData as { selector?: string }).selector}`
        );
        return [];
      }
      const notes = ((rawData as { results?: SearchResultNote[] }).results ||
        []) as SearchResultNote[];
      debugLog(
        `Extracted ${notes.length} valid notes from ${(rawData as { count?: number }).count} items`
      );
      return notes;
    }

    debugLog('Unexpected result format from page.evaluate');
    return [];
  } catch (error) {
    debugLog('page.evaluate error:', error);

    if (error instanceof Error) {
      debugLog('Error message:', error.message);
      debugLog('Error stack:', error.stack?.substring(0, 500));
    }

    return [];
  }
}

/**
 * Scroll to load more results
 */
async function loadMoreResults(page: Page, targetCount: number): Promise<void> {
  let scrollCount = 0;
  const maxScrolls = Math.ceil(targetCount / NOTES_PER_SCROLL) + 2;

  while (scrollCount < maxScrolls) {
    const currentCount = await page
      .locator(`${SEARCH_CONTAINER_SELECTOR} ${NOTE_ITEM_SELECTOR}`)
      .count()
      .catch(() => 0);

    if (currentCount >= targetCount) {
      debugLog(`Loaded enough results: ${currentCount}`);
      break;
    }

    debugLog(`Scrolling to load more (current: ${currentCount}, target: ${targetCount})`);
    await humanScroll(page, { distance: 500 });
    await randomDelay(1000, 2000);

    scrollCount++;
  }
}

// ============================================
// Main Search Function
// ============================================

/**
 * Perform search and return results
 */
async function performSearch(
  page: Page,
  keyword: string,
  limit: number,
  sort: SearchSortType
): Promise<SearchResult> {
  debugLog('Starting performSearch...');

  // Navigate to search page
  await navigateToSearch(page, keyword, sort);

  // Wait for page to stabilize
  debugLog('Waiting for page to stabilize...');
  await delay(2000);

  // Check for captcha
  const hasCaptcha = await checkCaptcha(page);
  if (hasCaptcha) {
    throw new XhsError(
      'CAPTCHA detected during search. Please try again later.',
      XhsErrorCode.CAPTCHA_REQUIRED
    );
  }

  // Check if we have any results
  const noteLocator = page.locator(`${SEARCH_CONTAINER_SELECTOR} ${NOTE_ITEM_SELECTOR}`);
  const initialCount = await noteLocator.count().catch(() => 0);
  debugLog(`Initial note count: ${initialCount}`);

  if (initialCount === 0) {
    debugLog('No notes found on page, check if page loaded correctly');
    // Try alternative selector
    const altLocator = page.locator('.note-item');
    const altCount = await altLocator.count().catch(() => 0);
    debugLog(`Alternative selector count: ${altCount}`);
  }

  // Load more results if needed
  if (limit > NOTES_PER_SCROLL) {
    await loadMoreResults(page, limit);
  }

  // Hover on notes to trigger URL generation with xsec_token
  debugLog('Starting hover phase...');
  await hoverNotesForTokens(page, limit);

  // Wait after hovering for any dynamic content to load
  await delay(1000);

  // Extract results
  debugLog('Starting extraction phase...');
  const notes = await extractSearchResults(page, limit);

  debugLog(`performSearch complete, found ${notes.length} notes`);

  return {
    keyword,
    total: notes.length,
    notes,
  };
}

/**
 * Execute search command
 */
export async function executeSearch(options: SearchOptions): Promise<void> {
  const { keyword, limit = DEFAULT_SEARCH_LIMIT, sort = 'hot', headless } = options;

  debugLog(`Search command: keyword="${keyword}", limit=${limit}, sort=${sort}`);
  debugLog(`Headless mode: ${headless ?? config.headless}`);

  let instance: BrowserInstance | null = null;

  try {
    // Validate cookies
    debugLog('Loading and validating cookies...');
    const cookies = await loadCookies();
    validateCookies(cookies);
    debugLog(`Loaded ${cookies.length} cookies`);

    // Create browser instance
    const isHeadless = headless ?? config.headless;
    debugLog('Creating browser instance...');
    instance = await createBrowserInstance({ headless: isHeadless });
    debugLog('Browser instance created');

    // Add cookies to context
    debugLog('Adding cookies to context...');
    await instance.context.addCookies(cookies);

    // Verify login status
    debugLog('Verifying login status...');
    await instance.page.goto(XHS_URLS.home, { timeout: PAGE_LOAD_TIMEOUT });
    await delay(2000); // Wait for page to fully load

    const isLoggedIn = await checkLoginStatus(instance.page);
    debugLog(`Login status: ${isLoggedIn}`);

    if (!isLoggedIn) {
      debugLog('Login check failed: checking for login modal...');

      // Check specifically for login modal
      const hasLoginModal = await instance.page
        .locator('[class*="login"], [class*="qrcode"], [class*="QRCode"]')
        .first()
        .isVisible()
        .catch(() => false);

      if (hasLoginModal) {
        debugLog('Login modal detected - user needs to login');
      }

      throw new XhsError(
        'Not logged in or session expired. Please run "xhs login" first.',
        XhsErrorCode.NOT_LOGGED_IN
      );
    }

    // Perform search
    debugLog('Starting search...');
    const result = await performSearch(instance.page, keyword, limit, sort);

    debugLog('Search complete, outputting result...');
    outputSuccess(result);
    debugLog('Result output complete');
  } catch (error) {
    debugLog('Search error:', error);
    outputFromError(error);
  } finally {
    debugLog('Closing browser...');
    await closeBrowserInstance(instance);
    debugLog('Browser closed');
  }
}
