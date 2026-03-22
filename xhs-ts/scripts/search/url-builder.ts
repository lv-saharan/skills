/**
 * Search URL builder
 *
 * @module search/url-builder
 * @description Build search URLs with parameters
 */

import type {
  SearchSortType,
  SearchNoteType,
  SearchTimeRange,
  SearchScope,
  SearchLocation,
} from './types';
import { XHS_URLS } from '../shared';

// ============================================
// Filter Value Mappings
// ============================================

/** Map sort type to URL parameter value */
const SORT_TYPE_MAP: Record<SearchSortType, string> = {
  general: 'general',
  time_descending: 'time_descending',
  hot: 'hot',
};

/** Map note type to URL parameter value */
const NOTE_TYPE_MAP: Record<SearchNoteType, string> = {
  all: '',
  image: 'note_type_1',
  video: 'note_type_2',
};

/** Map time range to URL parameter value */
const TIME_RANGE_MAP: Record<SearchTimeRange, string> = {
  all: '',
  day: 'time_filter_1',
  week: 'time_filter_2',
  month: 'time_filter_3',
};

/** Map scope to URL parameter value */
const SCOPE_MAP: Record<SearchScope, string> = {
  all: '',
  following: 'following',
};

/** Map location to URL parameter value */
const LOCATION_MAP: Record<SearchLocation, string> = {
  all: '',
  nearby: 'nearby',
  city: 'city',
};

// ============================================
// URL Builder Options
// ============================================

/** Options for building search URL */
export interface BuildSearchUrlOptions {
  /** Search keyword */
  keyword: string;
  /** Sort type (default: general) */
  sort?: SearchSortType;
  /** Note type filter */
  noteType?: SearchNoteType;
  /** Time range filter */
  timeRange?: SearchTimeRange;
  /** Search scope filter */
  scope?: SearchScope;
  /** Location filter */
  location?: SearchLocation;
}

/**
 * Build search URL with parameters
 *
 * @description Constructs a Xiaohongshu search URL with the given filters.
 * The URL follows the pattern: https://www.xiaohongshu.com/search_result?keyword=xxx&...
 */
export function buildSearchUrl(options: BuildSearchUrlOptions): string {
  const { keyword, sort = 'general', noteType, timeRange, scope, location } = options;

  const params = new URLSearchParams({
    keyword,
    source: 'web_search_result_notes',
  });

  // Add sort parameter (always include, as it affects default ordering)
  if (sort !== 'general') {
    params.set('sort', SORT_TYPE_MAP[sort]);
  }

  // Add note type filter
  if (noteType && noteType !== 'all') {
    params.set('note_type', NOTE_TYPE_MAP[noteType]);
  }

  // Add time range filter
  if (timeRange && timeRange !== 'all') {
    params.set('time_filter', TIME_RANGE_MAP[timeRange]);
  }

  // Add scope filter
  if (scope && scope !== 'all') {
    params.set('scope', SCOPE_MAP[scope]);
  }

  // Add location filter
  if (location && location !== 'all') {
    params.set('location', LOCATION_MAP[location]);
  }

  return `${XHS_URLS.home}/search_result?${params.toString()}`;
}

/**
 * Get filter selector info for UI interaction
 * Used when filters need to be applied via UI interaction rather than URL
 *
 * NOTE: These selectors are based on observed DOM structure and may need updates
 * if Xiaohongshu changes their UI. URL parameters are the primary filter mechanism.
 */
export function getFilterSelectors() {
  return {
    // Sort tabs - button.tab with aria-details attribute
    sort: {
      general: 'button.tab[aria-details="综合"]',
      time_descending: 'button.tab[aria-details="最新"]',
      hot: 'button.tab[aria-details="最热"]',
    },
    // Note type tabs - div.channel with id
    noteType: {
      all: '#all.channel',
      image: '#image.channel',
      video: '#video.channel',
    },
    // Time range - usually in a dropdown, need to find actual selectors
    timeRange: {
      all: '',
      day: '[data-time-filter="time_filter_1"], button:has-text("一天内")',
      week: '[data-time-filter="time_filter_2"], button:has-text("一周内")',
      month: '[data-time-filter="time_filter_3"], button:has-text("一月内")',
    },
    // Scope filter
    scope: {
      all: '',
      following: 'button.tab[aria-details="关注"], [data-scope="following"]',
    },
    // Location tabs - button.tab with aria-details for location names
    location: {
      all: '',
      nearby: 'button.tab[aria-details="推荐附近"]',
      city: 'button.tab[aria-details*="市"], button.tab[aria-details*="城"]',
    },
  };
}
