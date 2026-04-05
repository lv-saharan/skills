/**
 * Search result extractor
 *
 * @module search/result-extractor
 * @description Extract search results from page
 */

import type { Page } from 'playwright';
import type { SearchResultNote } from './types';
import { debugLog } from '../../core/utils';

/** Search result container selector */
const SEARCH_CONTAINER_SELECTOR = '.feeds-container';

/** Note item selector */
const NOTE_ITEM_SELECTOR = '.note-item';

/** Result type from page.evaluate */
type ExtractResult = {
  error: string | null;
  count: number;
  results: SearchResultNote[];
};

/**
 * Extract search results using page.evaluate
 * Requires __name polyfill in stealth injection (added to browser/stealth.ts)
 * to handle tsx/esbuild __name injection that conflicts with XHS page's __name
 */
export async function extractSearchResults(
  page: Page,
  limit: number,
  skip: number = 0
): Promise<SearchResultNote[]> {
  debugLog('Extracting search results...');

  const noteLocator = page.locator(`${SEARCH_CONTAINER_SELECTOR} ${NOTE_ITEM_SELECTOR}`);
  const count = await noteLocator.count().catch(() => 0);
  // Calculate extraction range
  const startIndex = skip;
  const endIndex = Math.min(count, skip + limit);
  const actualLimit = endIndex - startIndex;

  if (actualLimit <= 0) {
    debugLog(`No notes to extract (skip=${skip}, limit=${limit}, available=${count})`);
    return [];
  }

  debugLog(
    `Found ${count} note items, extracting from index ${skip} to ${endIndex} (total ${actualLimit})`
  );

  try {
    // Direct page.evaluate with arrow function
    // __name polyfill is injected via stealth.ts to handle tsx/esbuild injection
    const rawData = (await page.evaluate(
      ({ containerSel, noteSel, skip, max: _max, limit }) => {
        const container = document.querySelector(containerSel);
        if (!container) {
          return { error: 'container_not_found', selector: containerSel, count: 0, results: [] };
        }

        const items = container.querySelectorAll(noteSel);
        const results: SearchResultNote[] = [];

        const parseCount = (text: string | null | undefined): number => {
          if (!text) {
            return 0;
          }
          const t = String(text).trim();
          if (!t || t === '赞' || t === '收藏' || t === '评论') {
            return 0;
          }
          if (t.includes('万')) {
            return Math.floor(parseFloat(t) * 10000);
          }
          return parseInt(t.replace(/[^0-9]/g, ''), 10) || 0;
        };

        const extractInfo = (el: Element): { noteId: string; xsecToken: string } => {
          const links = el.querySelectorAll('a');
          let noteId = '';
          let xsecToken = '';

          for (const link of links) {
            const href = link.getAttribute('href') || '';

            if (href.includes('xsec_token') && href.includes('/search_result/')) {
              const match1 = href.match(new RegExp('/search_result/([a-zA-Z0-9]+)'));
              const match2 = href.match(/xsec_token=([^&]+)/);
              if (match1?.[1] && match1[1].length >= 20) {
                noteId = match1[1];
                if (match2?.[1]) {
                  xsecToken = decodeURIComponent(match2[1]);
                }
                break;
              }
            }

            if (href.includes('xsec_token') && href.includes('/explore/') && !noteId) {
              const match1 = href.match(new RegExp('/explore/([a-zA-Z0-9]+)'));
              const match2 = href.match(/xsec_token=([^&]+)/);
              if (match1?.[1] && match1[1].length >= 20) {
                noteId = match1[1];
                if (match2?.[1]) {
                  xsecToken = decodeURIComponent(match2[1]);
                }
                break;
              }
            }

            if (href.includes('/explore/') && !noteId) {
              const match = href.match(new RegExp('/explore/([a-zA-Z0-9]+)'));
              if (match?.[1] && match[1].length >= 20) {
                noteId = match[1];
              }
            }
          }

          return { noteId, xsecToken };
        };

        // Continue iterating until we have enough valid results
        // (some items may not have noteId, so we need to look beyond max)
        for (let idx = skip; idx < items.length && results.length < limit; idx++) {
          const item = items[idx];
          const info = extractInfo(item);

          if (!info.noteId) {
            continue;
          }

          const noteUrl = info.xsecToken
            ? 'https://www.xiaohongshu.com/explore/' +
              info.noteId +
              '?xsec_token=' +
              encodeURIComponent(info.xsecToken) +
              '&xsec_source=pc_search'
            : 'https://www.xiaohongshu.com/explore/' + info.noteId;

          // Title: use .title span or .title directly (XHS uses <a class="title"><span>text</span></a>)
          const titleEl = item.querySelector('.title span') || item.querySelector('.title');
          const title = titleEl?.textContent?.trim() || '笔记 ' + (idx - skip + 1);

          const imgEl = item.querySelector('img');
          const cover = imgEl?.src || '';

          // Author name: use .name directly (separate from .time in .name-time-wrapper)
          // Note: [class*='author'] would match the whole <a class="author"> which includes time
          const authorNameEl = item.querySelector('.name');
          const authorLinkEl = item.querySelector("a[href*='/user/profile/']");
          const authorHref = authorLinkEl?.getAttribute('href') || '';
          const authorIdMatch = authorHref.match(new RegExp('/user/profile/([a-zA-Z0-9]+)'));

          // Likes: the only stat shown on search results page
          const likesEl = item.querySelector('.like-wrapper .count');

          // Note: XHS search results page does NOT show collects/comments counts
          // These are only available on the note detail page

          results.push({
            id: info.noteId,
            title,
            author: {
              id: authorIdMatch?.[1] || '',
              name: authorNameEl?.textContent?.trim() || '未知作者',
              url: authorHref,
            },
            stats: {
              likes: parseCount(likesEl?.textContent),
              collects: 0, // Not available on search results page
              comments: 0, // Not available on search results page
            },
            cover,
            url: noteUrl,
            xsecToken: info.xsecToken,
          });
        }

        return { error: null, count: items.length, results };
      },
      {
        containerSel: SEARCH_CONTAINER_SELECTOR,
        noteSel: NOTE_ITEM_SELECTOR,
        skip: startIndex,
        max: endIndex,
        limit: limit,
      }
    )) as ExtractResult;

    if (rawData && typeof rawData === 'object' && rawData.error) {
      debugLog(`Extract error: ${rawData.error}`);
      return [];
    }

    const notes = rawData?.results ?? [];
    debugLog(`Extracted ${notes.length} valid notes`);
    return notes;
  } catch (error) {
    debugLog('page.evaluate error:', error);
    return [];
  }
}
