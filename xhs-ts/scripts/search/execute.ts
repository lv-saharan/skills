/**
 * Search command implementation
 *
 * @module search/execute
 * @description Search notes by keyword with filtering options
 */

import type { Page } from 'playwright';
import type {
  SearchOptions,
  SearchResult,
  SearchSortType,
  SearchNoteType,
  SearchTimeRange,
  SearchScope,
  SearchLocation,
} from './types';
import { buildSearchUrl, getFilterSelectors } from './url-builder';
import { extractSearchResults } from './result-extractor';
import { XhsError, XhsErrorCode } from '../shared';
import { TIMEOUTS } from '../shared';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { XHS_URLS, config, debugLog, delay, randomDelay } from '../utils/helpers';
import { humanClick, humanScroll, checkCaptcha, checkLoginStatus } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';

// ============================================
// Constants
// ============================================

/** Search result container selector */
const SEARCH_CONTAINER_SELECTOR = '.feeds-container';

/** Note item selector (relative to container) */
const NOTE_ITEM_SELECTOR = '.note-item';

/** Default search limit */
const DEFAULT_SEARCH_LIMIT = 10;

/** Maximum search limit */
const MAX_SEARCH_LIMIT = 100;

/** Maximum notes to extract per scroll */
const NOTES_PER_SCROLL = 20;

/** Timeout constants */
// Use TIMEOUTS.PAGE_LOAD from shared
const SELECTOR_TIMEOUT = 15000;

// ============================================
// Homepage Search Selectors
// ============================================

/** Homepage search input selectors (multiple fallbacks) */
const HOMEPAGE_SEARCH_INPUT_SELECTORS = [
  'input[placeholder*="探索"]',
  'input[placeholder*="搜索"]',
  '.search-input input',
  'header input[type="text"]',
  '#search-input',
  '[class*="search"] input',
];

/** Homepage search button selectors (multiple fallbacks) */
const HOMEPAGE_SEARCH_BUTTON_SELECTORS = [
  'header button[type="submit"]',
  'header .search-btn',
  'header [class*="searchBtn"]',
  'button[aria-label*="搜索"]',
  'button[aria-label*="search"]',
];

// ============================================
// Verification Page Detection
// ============================================

/**
 * Check if current page is a verification/captcha/login redirect page
 * This happens when XHS detects automated access and blocks direct URL navigation
 */
async function isVerificationPage(page: Page): Promise<boolean> {
  const url = page.url();

  // Check URL patterns for verification pages
  if (
    url.includes('/website-login/captcha') ||
    url.includes('/login/captcha') ||
    url.includes('/verify') ||
    url.includes('/captcha') ||
    url.includes('/signin')
  ) {
    debugLog('Verification page detected via URL pattern');
    return true;
  }

  // Check for verification page elements
  const verificationIndicators = [
    '.captcha-container',
    '#captcha',
    '[class*="verify"]',
    '[class*="verification"]',
    'text=/安全验证/',
    'text=/请完成验证/',
  ];

  for (const selector of verificationIndicators) {
    try {
      const isVisible = await page.locator(selector).first().isVisible({ timeout: 1000 });
      if (isVisible) {
        debugLog(`Verification page detected via element: ${selector}`);
        return true;
      }
    } catch {
      // Ignore
    }
  }

  return false;
}

/**
 * Check if search container is present (results loaded)
 */
async function hasSearchResults(page: Page): Promise<boolean> {
  try {
    const container = page.locator(SEARCH_CONTAINER_SELECTOR);
    const isVisible = await container.isVisible({ timeout: 3000 });
    if (isVisible) {
      const noteCount = await page.locator(NOTE_ITEM_SELECTOR).count();
      return noteCount > 0;
    }
  } catch {
    // Ignore
  }
  return false;
}

// ============================================
// Homepage Search Fallback
// ============================================

/**
 * Perform search via homepage search bar
 * This is a fallback when direct URL navigation is blocked by verification
 */
async function searchViaHomepage(page: Page, keyword: string): Promise<void> {
  debugLog('Attempting search via homepage search bar...');

  // Navigate to homepage
  await page.goto(XHS_URLS.home, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.PAGE_LOAD,
  });
  await delay(2000);

  // Find search input
  let searchInput: ReturnType<Page['locator']> | null = null;
  // Track which selector worked
  for (const selector of HOMEPAGE_SEARCH_INPUT_SELECTORS) {
    try {
      const input = page.locator(selector).first();
      const isVisible = await input.isVisible({ timeout: 2000 });
      if (isVisible) {
        searchInput = input;
        debugLog(`Found search input with selector: ${selector}`);
        debugLog(`Found search input with selector: ${selector}`);
        break;
      }
    } catch {
      // Try next selector
    }
  }

  if (!searchInput) {
    throw new XhsError(
      'Cannot find search input on homepage. The page structure may have changed.',
      XhsErrorCode.NOT_FOUND
    );
  }

  // Click on search input to focus
  await searchInput.click();
  await randomDelay(300, 500);

  // Clear existing content and type keyword
  await searchInput.fill('');
  await randomDelay(200, 400);

  // Type keyword with human-like delays
  for (const char of keyword) {
    await searchInput.pressSequentially(char, { delay: 50 + Math.random() * 50 });
  }

  await randomDelay(500, 1000);

  // Find and click search button or press Enter
  let searchButton: ReturnType<Page['locator']> | null = null;
  for (const selector of HOMEPAGE_SEARCH_BUTTON_SELECTORS) {
    try {
      const btn = page.locator(selector).first();
      const isVisible = await btn.isVisible({ timeout: 2000 });
      if (isVisible) {
        searchButton = btn;
        debugLog(`Found search button with selector: ${selector}`);
        break;
      }
    } catch {
      // Try next selector
    }
  }

  if (searchButton) {
    await searchButton.click();
  } else {
    // Fallback: Press Enter key
    debugLog('Search button not found, pressing Enter instead');
    await searchInput.press('Enter');
  }

  // Wait for navigation to search results
  debugLog('Waiting for search results to load...');
  await delay(3000);

  // Wait for search results container
  try {
    await page.waitForSelector(SEARCH_CONTAINER_SELECTOR, { timeout: SELECTOR_TIMEOUT });
    debugLog(`Found search container: ${SEARCH_CONTAINER_SELECTOR}`);
  } catch {
    debugLog('Search container not found after homepage search');
    await delay(2000);
  }
}

// ============================================
// Filter Options Interface
// ============================================

/** Internal filter options for search */
interface SearchFilters {
  sort: SearchSortType;
  noteType: SearchNoteType;
  timeRange: SearchTimeRange;
  scope: SearchScope;
  location: SearchLocation;
}

// ============================================
// Search Page Navigation
// ============================================

/**
 * Navigate to search page with fallback to homepage search bar
 * When direct URL navigation is blocked by verification, use homepage search instead
 */
async function navigateToSearch(
  page: Page,
  keyword: string,
  filters: SearchFilters
): Promise<{ usedFallback: boolean }> {
  const searchUrl = buildSearchUrl({
    keyword,
    sort: filters.sort,
    noteType: filters.noteType,
    timeRange: filters.timeRange,
    scope: filters.scope,
    location: filters.location,
  });
  debugLog(`Navigating to search URL: ${searchUrl}`);

  await page.goto(searchUrl, {
    waitUntil: 'domcontentloaded',
    timeout: TIMEOUTS.PAGE_LOAD,
  });

  // Check if we were redirected to verification page
  const isVerification = await isVerificationPage(page);

  if (isVerification) {
    debugLog('Redirected to verification page, attempting homepage search fallback...');

    // Try homepage search as fallback
    await searchViaHomepage(page, keyword);

    // Check if we now have search results
    const hasResults = await hasSearchResults(page);
    if (!hasResults) {
      throw new XhsError(
        'Homepage search fallback failed. Cannot access search results.',
        XhsErrorCode.NOT_FOUND
      );
    }

    debugLog('Homepage search fallback successful');
    return { usedFallback: true };
  }

  // Wait for search results container
  try {
    await page.waitForSelector(SEARCH_CONTAINER_SELECTOR, { timeout: SELECTOR_TIMEOUT });
    debugLog(`Found search container: ${SEARCH_CONTAINER_SELECTOR}`);
  } catch {
    debugLog('Search container not found, waiting for page load');
    await delay(3000);

    // Double check if we need fallback (verification page might load after delay)
    const stillNoResults = !(await hasSearchResults(page));
    if (stillNoResults) {
      debugLog('No results after waiting, attempting homepage search fallback...');
      await searchViaHomepage(page, keyword);
      return { usedFallback: true };
    }
  }

  // Apply filters via UI if needed (some filters may require UI interaction)
  await applyFiltersViaUI(page, filters);

  return { usedFallback: false };
}

/**
 * Apply filters via UI interaction
 * Some filters may not work via URL params and need UI clicks
 */
async function applyFiltersViaUI(page: Page, filters: SearchFilters): Promise<void> {
  const selectors = getFilterSelectors();

  // Apply sort filter
  if (filters.sort !== 'general') {
    const sortSelector = selectors.sort[filters.sort];
    if (sortSelector) {
      await clickFilterButton(page, sortSelector, 'sort');
    }
  }

  // Apply note type filter
  if (filters.noteType !== 'all') {
    const noteTypeSelector = selectors.noteType[filters.noteType];
    if (noteTypeSelector) {
      await clickFilterButton(page, noteTypeSelector, 'noteType');
    }
  }

  // Apply time range filter
  if (filters.timeRange !== 'all') {
    const timeRangeSelector = selectors.timeRange[filters.timeRange];
    if (timeRangeSelector) {
      await clickFilterButton(page, timeRangeSelector, 'timeRange');
    }
  }

  // Apply scope filter
  if (filters.scope !== 'all') {
    const scopeSelector = selectors.scope[filters.scope];
    if (scopeSelector) {
      await clickFilterButton(page, scopeSelector, 'scope');
    }
  }

  // Apply location filter
  if (filters.location !== 'all') {
    const locationSelector = selectors.location[filters.location];
    if (locationSelector) {
      await clickFilterButton(page, locationSelector, 'location');
    }
  }
}

/**
 * Click a filter button safely
 */
async function clickFilterButton(page: Page, selector: string, filterName: string): Promise<void> {
  try {
    const button = page.locator(selector).first();
    const isVisible = await button.isVisible({ timeout: 3000 }).catch(() => false);

    if (isVisible) {
      debugLog(`Applying ${filterName} filter...`);
      await humanClick(page, selector);
      await randomDelay(1000, 2000);
      debugLog(`${filterName} filter applied`);
    }
  } catch (error) {
    debugLog(`Failed to apply ${filterName} filter`, error);
  }
}

// ============================================
// Note Extraction
// ============================================

/**
 * Extract note links by hovering on note items
 * This triggers the generation of xsec_token in URLs
 */
async function hoverNotesForTokens(page: Page, count: number, skip: number = 0): Promise<void> {
  const noteLocator = page.locator(`${SEARCH_CONTAINER_SELECTOR} ${NOTE_ITEM_SELECTOR}`);
  const elementCount = await noteLocator.count();

  if (elementCount === 0) {
    debugLog('No note elements found to hover');
    return;
  }

  debugLog(`Found ${elementCount} note elements`);

  // Need to hover from skip to skip + count
  const startIndex = skip;
  const endIndex = Math.min(elementCount, skip + count);
  const hoverCount = endIndex - startIndex;

  if (hoverCount <= 0) {
    debugLog(`No notes to hover (skip=${skip}, count=${count}, available=${elementCount})`);
    return;
  }
  debugLog(
    `Hovering on notes ${startIndex + 1} to ${endIndex} (total ${hoverCount}) to extract URLs`
  );

  for (let i = startIndex; i < endIndex; i++) {
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

// Result extractor imported from ./result-extractor

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
  skip: number,
  filters: SearchFilters
): Promise<SearchResult> {
  debugLog('Starting performSearch...');

  // Navigate to search page (with fallback to homepage search)
  const { usedFallback } = await navigateToSearch(page, keyword, filters);
  if (usedFallback) {
    debugLog('Search completed via homepage fallback');
  }

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

  // Calculate total results needed (skip + limit)
  const totalNeeded = skip + limit;

  // Load more results if needed
  if (totalNeeded > NOTES_PER_SCROLL) {
    await loadMoreResults(page, totalNeeded);
  }

  // Hover on notes to trigger URL generation with xsec_token
  debugLog('Starting hover phase...');
  await hoverNotesForTokens(page, limit, skip);

  // Wait after hovering for any dynamic content to load
  await delay(1000);

  // Extract results
  debugLog('Starting extraction phase...');
  const notes = await extractSearchResults(page, limit, skip);

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
  const {
    keyword,
    limit: rawLimit = DEFAULT_SEARCH_LIMIT,
    skip = 0,
    sort = 'general',
    noteType = 'all',
    timeRange = 'all',
    scope = 'all',
    location = 'all',
    headless,
    user,
  } = options;

  // Validate and clamp limit
  const limit = Math.min(Math.max(1, rawLimit), MAX_SEARCH_LIMIT);
  if (rawLimit !== limit) {
    debugLog(`Limit adjusted from ${rawLimit} to ${limit} (max: ${MAX_SEARCH_LIMIT})`);
  }

  const filters: SearchFilters = {
    sort,
    noteType,
    timeRange,
    scope,
    location,
  };

  debugLog(
    `Search command: keyword="${keyword}", limit=${limit}, skip=${skip}, filters=${JSON.stringify(filters)}, user=${user || 'default'}`
  );
  debugLog(`Headless mode: ${headless ?? config.headless}`);

  await withSession(
    async (session) => {
      // Validate cookies
      debugLog(`Loading and validating cookies for user: ${user || 'default'}...`);
      const cookies = await loadCookies(user);
      validateCookies(cookies);

      // Add cookies to context
      debugLog('Adding cookies to context...');
      await session.context.addCookies(cookies);

      // Verify login status
      debugLog('Verifying login status...');
      await session.page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
      await delay(2000); // Wait for page to fully load

      const isLoggedIn = await checkLoginStatus(session.page);
      debugLog(`Login status: ${isLoggedIn}`);

      if (!isLoggedIn) {
        throw new XhsError(
          'Not logged in or session expired. Please run "xhs login" first.',
          XhsErrorCode.NOT_LOGGED_IN
        );
      }

      // Perform search
      debugLog('Starting search...');
      const result = await performSearch(session.page, keyword, limit, skip, filters);
      result.user = user;

      debugLog('Search complete, outputting result...');
      outputSuccess(result, 'PARSE:notes');
      debugLog('Result output complete');
    },
    { headless: headless ?? config.headless }
  ).catch((error) => {
    debugLog('Search error:', error);
    outputFromError(error);
  });
}
