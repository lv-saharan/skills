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
 * Extract search results from page using Locator API with parallel extraction
 * Optimized: uses Promise.all for parallel attribute fetching
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

  // Extract all notes in parallel
  const extractionPromises: Promise<SearchResultNote | null>[] = [];

  for (let i = 0; i < actualLimit; i++) {
    extractionPromises.push(extractSingleNote(noteLocator.nth(i), i));
  }

  const results = await Promise.all(extractionPromises);
  const validResults = results.filter((note): note is SearchResultNote => note !== null);

  debugLog(`Extracted ${validResults.length} valid notes`);
  return validResults;
}

/**
 * Extract a single note's data with parallel attribute fetching
 */
async function extractSingleNote(
  noteItem: import('playwright').Locator,
  index: number
): Promise<SearchResultNote | null> {
  try {
    // 优化1: 直接定位包含 xsec_token 的链接，而不是遍历所有链接
    const tokenLink = noteItem.locator('a[href*="xsec_token"][href*="/search_result/"]').first();
    const exploreTokenLink = noteItem.locator('a[href*="xsec_token"][href*="/explore/"]').first();
    const basicExploreLink = noteItem.locator('a[href*="/explore/"]').first();

    // 尝试获取带 token 的链接 (优先级: search_result > explore with token > basic explore)
    let href = await tokenLink.getAttribute('href').catch(() => null);
    let noteId = '';
    let xsecToken = '';

    if (href && href.includes('xsec_token')) {
      const idMatch = href.match(/\/search_result\/([a-zA-Z0-9]+)/);
      const tokenMatch = href.match(/xsec_token=([^&]+)/);
      if (idMatch?.[1] && idMatch[1].length >= 20) {
        noteId = idMatch[1];
        if (tokenMatch?.[1]) xsecToken = decodeURIComponent(tokenMatch[1]);
      }
    }

    // Fallback: explore link with token
    if (!noteId) {
      href = await exploreTokenLink.getAttribute('href').catch(() => null);
      if (href && href.includes('xsec_token')) {
        const idMatch = href.match(/\/explore\/([a-zA-Z0-9]+)/);
        const tokenMatch = href.match(/xsec_token=([^&]+)/);
        if (idMatch?.[1] && idMatch[1].length >= 20) {
          noteId = idMatch[1];
          if (tokenMatch?.[1]) xsecToken = decodeURIComponent(tokenMatch[1]);
        }
      }
    }

    // Fallback: basic explore link
    if (!noteId) {
      href = await basicExploreLink.getAttribute('href').catch(() => null);
      if (href) {
        const idMatch = href.match(/\/explore\/([a-zA-Z0-9]+)/);
        if (idMatch?.[1] && idMatch[1].length >= 20) {
          noteId = idMatch[1];
        }
      }
    }

    if (!noteId) {
      return null;
    }

    const noteUrl = xsecToken
      ? `https://www.xiaohongshu.com/explore/${noteId}?xsec_token=${encodeURIComponent(xsecToken)}&xsec_source=pc_search`
      : `https://www.xiaohongshu.com/explore/${noteId}`;

    // 优化2: 并行获取所有属性
    const [title, cover, authorName, authorHref, likesText, collectsText, commentsText] =
      await Promise.all([
        noteItem
          .locator('[class*="title"], [class*="content"]')
          .first()
          .textContent()
          .catch(() => ''),
        noteItem
          .locator('img')
          .first()
          .getAttribute('src')
          .catch(() => ''),
        noteItem
          .locator('[class*="author"], [class*="name"]')
          .first()
          .textContent()
          .catch(() => ''),
        noteItem
          .locator('a[href*="/user/profile/"]')
          .first()
          .getAttribute('href')
          .catch(() => ''),
        noteItem
          .locator('[class*="like"] .count, .like-wrapper .count')
          .first()
          .textContent()
          .catch(() => '0'),
        noteItem
          .locator('[class*="collect"] .count, .collect-wrapper .count')
          .first()
          .textContent()
          .catch(() => '0'),
        noteItem
          .locator('[class*="comment"] .count, .chat-wrapper .count')
          .first()
          .textContent()
          .catch(() => '0'),
      ]);

    const authorIdMatch = authorHref?.match(/\/user\/profile\/([a-zA-Z0-9]+)/);

    return {
      id: noteId,
      title: title?.trim() || `笔记 ${index + 1}`,
      author: {
        id: authorIdMatch?.[1] || '',
        name: authorName?.trim() || '未知作者',
        url: authorHref || '',
      },
      stats: {
        likes: parseStatCount(likesText || '0'),
        collects: parseStatCount(collectsText || '0'),
        comments: parseStatCount(commentsText || '0'),
      },
      cover: cover || '',
      url: noteUrl,
      xsecToken,
    };
  } catch (error) {
    debugLog(`Failed to extract note ${index + 1}`, error);
    return null;
  }
}

/**
 * Parse stat count text to number
 */
function parseStatCount(text: string): number {
  const trimmed = text.trim();
  if (!trimmed || trimmed === '赞' || trimmed === '收藏' || trimmed === '评论') {
    return 0;
  }
  if (trimmed.includes('万')) {
    return Math.floor(parseFloat(trimmed) * 10000);
  }
  return parseInt(trimmed.replace(/[^\d]/g, '')) || 0;
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
