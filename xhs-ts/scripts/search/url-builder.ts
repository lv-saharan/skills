/**
 * Search URL builder
 *
 * @module search/url-builder
 * @description Build search URLs with parameters
 */

import type { SearchSortType } from './types';
import { XHS_URLS } from '../shared';

/**
 * Build search URL with parameters
 */
export function buildSearchUrl(keyword: string, _sort: SearchSortType = 'hot'): string {
  const params = new URLSearchParams({
    keyword,
    source: 'web_search_result_notes',
  });

  return `${XHS_URLS.home}/search_result?${params.toString()}`;
}
