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
import { withProfile, randomStealthDelay } from '../browser';
import { resolveUser } from '../user';
import { debugLog, delay, XHS_URLS } from '../utils/helpers';
import { checkCaptcha } from '../utils/anti-detect';
import { outputSuccess, outputFromError } from '../utils/output';
import { ensureLogin } from '../login/auto-login';

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
    requested: limit,
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

  const resolvedUser = user ?? resolveUser();

  debugLog(
    `Search command: keyword="${keyword}", limit=${limit}, skip=${skip}, filters=${JSON.stringify(filters)}, user=${resolvedUser}`
  );

  await withProfile(
    resolvedUser,
    async (page, profileResult) => {
      const { behavior } = profileResult;

      // Navigate to home and verify login (Profile auto-loads persisted state)
      debugLog('Navigating to homepage...');
      debugLog('Pages before navigation: ' + page.context().pages().length);
      await page.goto(XHS_URLS.home, { timeout: TIMEOUTS.PAGE_LOAD });
      debugLog('Pages after navigation: ' + page.context().pages().length);
      await randomStealthDelay(behavior, 'read');

      // Ensure login (auto-login if needed)
      const loginResult = await ensureLogin(page, {
        user: resolvedUser,
        headless: headless ?? false,
        timeout: TIMEOUTS.LOGIN,
      });

      if (!loginResult.success) {
        throw new XhsError(loginResult.message || 'Not logged in', XhsErrorCode.NOT_LOGGED_IN);
      }

      // Perform search
      debugLog('Starting search...');
      const result = await performSearch(page, keyword, limit, skip, filters);
      result.user = resolvedUser;

      debugLog('Search complete, outputting result...');
      outputSuccess(result, 'PARSE:notes');
      debugLog('Result output complete');
    },
    { headless: headless ?? false, autoCreate: true }
  ).catch((error) => {
    debugLog('Search error:', error);
    outputFromError(error);
    process.exit(1);
  });
}
