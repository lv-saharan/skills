/**
 * Search command implementation
 *
 * @module search/execute
 * @description Search notes by keyword with filtering options - main orchestration
 */

import type { Page } from 'playwright';
import type { SearchOptions, SearchResult } from './types';
import type { SearchFilters } from './navigation';
import { SEARCH_CONTAINER_SELECTOR, NOTE_ITEM_SELECTOR, navigateToSearch } from './navigation';
import { extractSearchResults } from './result-extractor';
import { hoverNotesForTokens, loadMoreResults, NOTES_PER_SCROLL } from './extraction';
import { XhsError, XhsErrorCode } from '../shared';
import { TIMEOUTS } from '../shared';
import { withSession } from '../browser';
import { loadCookies, validateCookies } from '../cookie';
import { XHS_URLS, config, debugLog, delay } from '../utils/helpers';
import { checkCaptcha, checkLoginStatus } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';

// ============================================
// Constants
// ============================================

/** Default search limit */
const DEFAULT_SEARCH_LIMIT = 10;

/** Maximum search limit */
const MAX_SEARCH_LIMIT = 100;

// ============================================
// Perform Search
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

// ============================================
// Main Entry Point
// ============================================

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
