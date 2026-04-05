/**
 * Search result extraction helpers
 *
 * @module search/extraction
 * @description Helper functions for extracting search results
 */

import type { Page } from 'playwright';
import { SEARCH_CONTAINER_SELECTOR, NOTE_ITEM_SELECTOR } from './navigation';
import { debugLog, randomDelay } from '../../core/utils';
import { humanScroll } from '../../core/anti-detect';

// ============================================
// Constants
// ============================================

/** Maximum notes to extract per scroll */
export const NOTES_PER_SCROLL = 20;

// ============================================
// Hover for Token Extraction
// ============================================

/**
 * Extract note links by hovering on note items
 * This triggers the generation of xsec_token in URLs
 *
 * @param count - Number of valid results needed (will hover extra for backup)
 * @param skip - Number of results to skip
 */
export async function hoverNotesForTokens(
  page: Page,
  count: number,
  skip: number = 0
): Promise<void> {
  const noteLocator = page.locator(`${SEARCH_CONTAINER_SELECTOR} ${NOTE_ITEM_SELECTOR}`);
  const elementCount = await noteLocator.count();

  if (elementCount === 0) {
    debugLog('No note elements found to hover');
    return;
  }

  debugLog(`Found ${elementCount} note elements`);

  // Hover extra notes as backup (some may lack valid noteId)
  // Add 20% buffer to ensure enough valid results
  const hoverBuffer = Math.ceil(count * 0.2);
  const startIndex = skip;
  const endIndex = Math.min(elementCount, skip + count + hoverBuffer);
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

// ============================================
// Load More Results
// ============================================

/**
 * Scroll to load more results
 */
export async function loadMoreResults(page: Page, targetCount: number): Promise<void> {
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
