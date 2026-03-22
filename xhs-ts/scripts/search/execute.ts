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
import type { BrowserInstance } from '../browser';
import { createBrowserInstance, closeBrowserInstance } from '../browser';
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
const DEFAULT_SEARCH_LIMIT = 20;

/** Maximum notes to extract per scroll */
const NOTES_PER_SCROLL = 20;

/** Timeout constants */
// Use TIMEOUTS.PAGE_LOAD from shared
const SELECTOR_TIMEOUT = 15000;

// URL builder imported from ./url-builder

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
 * Navigate to search page and wait for results
 */
async function navigateToSearch(
  page: Page,
  keyword: string,
  filters: SearchFilters
): Promise<void> {
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

  // Wait for search results container
  try {
    await page.waitForSelector(SEARCH_CONTAINER_SELECTOR, { timeout: SELECTOR_TIMEOUT });
    debugLog(`Found search container: ${SEARCH_CONTAINER_SELECTOR}`);
  } catch {
    debugLog('Search container not found, waiting for page load');
    await delay(3000);
  }

  // Apply filters via UI if needed (some filters may require UI interaction)
  await applyFiltersViaUI(page, filters);
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
  filters: SearchFilters
): Promise<SearchResult> {
  debugLog('Starting performSearch...');

  // Navigate to search page
  await navigateToSearch(page, keyword, filters);

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
  const {
    keyword,
    limit = DEFAULT_SEARCH_LIMIT,
    sort = 'general',
    noteType = 'all',
    timeRange = 'all',
    scope = 'all',
    location = 'all',
    headless,
  } = options;

  const filters: SearchFilters = {
    sort,
    noteType,
    timeRange,
    scope,
    location,
  };

  debugLog(
    `Search command: keyword="${keyword}", limit=${limit}, filters=${JSON.stringify(filters)}`
  );
  debugLog(`Headless mode: ${headless ?? config.headless}`);

  let instance: BrowserInstance | null = null;

  try {
    // Validate cookies
    debugLog('Loading and validating cookies...');
    const cookies = await loadCookies();
    validateCookies(cookies);

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
    await instance.page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
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
    const result = await performSearch(instance.page, keyword, limit, filters);

    debugLog('Search complete, outputting result...');
    outputSuccess(result, 'PARSE:notes');
    debugLog('Result output complete');
  } catch (error) {
    debugLog('Search error:', error);
    outputFromError(error);
  } finally {
    debugLog('Closing browser...');
    await closeBrowserInstance(instance);
  }
}
