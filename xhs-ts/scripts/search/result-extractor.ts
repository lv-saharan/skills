/**
 * Search result extractor
 *
 * @module search/result-extractor
 * @description Extract search results from page
 */

import type { Page } from 'playwright';
import type { SearchResultNote } from './types';
import { debugLog } from '../utils/helpers';

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
export async function extractSearchResults(page: Page, limit: number): Promise<SearchResultNote[]> {
  debugLog('Extracting search results...');

  const noteLocator = page.locator(`${SEARCH_CONTAINER_SELECTOR} ${NOTE_ITEM_SELECTOR}`);
  const count = await noteLocator.count().catch(() => 0);
  const actualLimit = Math.min(count, limit);

  debugLog(`Found ${count} note items, extracting ${actualLimit}`);

  if (actualLimit === 0) {
    return [];
  }

  try {
    // Direct page.evaluate with arrow function
    // __name polyfill is injected via stealth.ts to handle tsx/esbuild injection
    const rawData = (await page.evaluate(
      ({ containerSel, noteSel, max }) => {
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

        const extractInfo = (el: Element) => {
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

        for (let idx = 0; idx < items.length && idx < max; idx++) {
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

          const titleEl =
            item.querySelector("[class*='title']") || item.querySelector("[class*='content']");
          const title = titleEl?.textContent?.trim() || '笔记 ' + (idx + 1);

          const imgEl = item.querySelector('img');
          const cover = imgEl?.src || '';

          const authorNameEl =
            item.querySelector("[class*='author']") || item.querySelector("[class*='name']");
          const authorLinkEl = item.querySelector("a[href*='/user/profile/']");
          const authorHref = authorLinkEl?.getAttribute('href') || '';
          const authorIdMatch = authorHref.match(new RegExp('/user/profile/([a-zA-Z0-9]+)'));

          const likesEl = item.querySelector("[class*='like'] .count, .like-wrapper .count");
          const collectsEl = item.querySelector(
            "[class*='collect'] .count, .collect-wrapper .count"
          );
          const commentsEl = item.querySelector("[class*='comment'] .count, .chat-wrapper .count");

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
              collects: parseCount(collectsEl?.textContent),
              comments: parseCount(commentsEl?.textContent),
            },
            cover,
            url: noteUrl,
            xsecToken: info.xsecToken,
          });
        }

        return { error: null, count: items.length, results };
      },
      { containerSel: SEARCH_CONTAINER_SELECTOR, noteSel: NOTE_ITEM_SELECTOR, max: actualLimit }
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
