/**
 * Search page navigation
 *
 * @module search/navigation
 * @description Navigate to search page with fallback mechanisms
 */

import type { Page } from 'playwright';
import type {
  SearchSortType,
  SearchNoteType,
  SearchTimeRange,
  SearchScope,
  SearchLocation,
} from './types';
import { buildSearchUrl, getFilterSelectors } from './url-builder';
import { SkillError, SkillErrorCode, timeouts, urls } from '../../config';
import { debugLog, delay, randomDelay } from '../../core/utils';
import { humanClick, humanType } from '../../core/anti-detect';

// ============================================
// Constants
// ============================================

/** Search result container selector */
export const SEARCH_CONTAINER_SELECTOR = '.feeds-container';

/** Note item selector (relative to container) */
export const NOTE_ITEM_SELECTOR = '.note-item';

/** Timeout for selector waiting */
const SELECTOR_TIMEOUT = 15000;

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
// Filter Options Interface
// ============================================

/** Internal filter options for navigation */
export interface SearchFilters {
  sort: SearchSortType;
  noteType: SearchNoteType;
  timeRange: SearchTimeRange;
  scope: SearchScope;
  location: SearchLocation;
}

// ============================================
// Verification Page Detection
// ============================================

/**
 * Check if current page is a verification/captcha/login redirect page
 * This happens when XHS detects automated access and blocks direct URL navigation
 */
export async function isVerificationPage(page: Page): Promise<boolean> {
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
export async function hasSearchResults(page: Page): Promise<boolean> {
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
export async function searchViaHomepage(page: Page, keyword: string): Promise<void> {
  debugLog('Attempting search via homepage search bar...');

  // Navigate to homepage
  await page.goto(urls.home, {
    waitUntil: 'domcontentloaded',
    timeout: timeouts.pageLoad,
  });
  await delay(2000);

  // Find search input
  let searchInput: ReturnType<Page['locator']> | null = null;
  for (const selector of HOMEPAGE_SEARCH_INPUT_SELECTORS) {
    try {
      const input = page.locator(selector).first();
      const isVisible = await input.isVisible({ timeout: 2000 });
      if (isVisible) {
        searchInput = input;
        debugLog(`Found search input with selector: ${selector}`);
        break;
      }
    } catch {
      // Try next selector
    }
  }

  if (!searchInput) {
    throw new SkillError(
      'Cannot find search input on homepage. The page structure may have changed.',
      SkillErrorCode.NOT_FOUND
    );
  }

  // Click on search input to focus
  await searchInput.click();
  await randomDelay(300, 500);

  // Type keyword with human-like delays
  await humanType(searchInput, keyword, {
    minDelay: 40,
    maxDelay: 100,
    thinkPauseChance: 0.05,
    typoChance: 0,
    clearFirst: true,
  });

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
// Filter UI Interaction
// ============================================

/**
 * Apply filters via UI interaction
 * Some filters may not work via URL params and need UI clicks
 */
export async function applyFiltersViaUI(page: Page, filters: SearchFilters): Promise<void> {
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
// Main Navigation Function
// ============================================

/**
 * Navigate to search page with fallback to homepage search bar
 * When direct URL navigation is blocked by verification, use homepage search instead
 */
export async function navigateToSearch(
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
    timeout: timeouts.pageLoad,
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
      throw new SkillError(
        'Homepage search fallback failed. Cannot access search results.',
        SkillErrorCode.NOT_FOUND
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
