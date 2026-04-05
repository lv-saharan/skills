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
import { urls } from '../../config';

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

  return `${urls.home}/search_result?${params.toString()}`;
}

// ============================================
// Filter Selectors (for UI interaction)
// ============================================

/**
 * Get sort filter selectors
 *
 * @description Sort tabs - button.tab with aria-details attribute
 */
export function getSortSelectors(): Record<SearchSortType, string> {
  return {
    general: 'button.tab[aria-details="综合"]',
    time_descending: 'button.tab[aria-details="最新"]',
    hot: 'button.tab[aria-details="最热"]',
  };
}

/**
 * Get note type filter selectors
 *
 * @description Note type tabs - div.channel with id
 */
export function getNoteTypeSelectors(): Record<SearchNoteType, string> {
  return {
    all: '#all.channel',
    image: '#image.channel',
    video: '#video.channel',
  };
}

/**
 * Get time range filter selectors
 *
 * @description Time range dropdown selectors
 * NOTE: These selectors may need updates if Xiaohongshu changes their UI
 */
export function getTimeRangeSelectors(): Record<SearchTimeRange, string> {
  return {
    all: '',
    day: '[data-time-filter="time_filter_1"], button:has-text("一天内")',
    week: '[data-time-filter="time_filter_2"], button:has-text("一周内")',
    month: '[data-time-filter="time_filter_3"], button:has-text("一月内")',
  };
}

/**
 * Get scope filter selectors
 *
 * @description Scope filter for following tab
 */
export function getScopeSelectors(): Record<SearchScope, string> {
  return {
    all: '',
    following: 'button.tab[aria-details="关注"], [data-scope="following"]',
  };
}

/**
 * Get location filter selectors
 *
 * @description Location tabs - button.tab with aria-details for location names
 */
export function getLocationSelectors(): Record<SearchLocation, string> {
  return {
    all: '',
    nearby: 'button.tab[aria-details="推荐附近"]',
    city: 'button.tab[aria-details*="市"], button.tab[aria-details*="城"]',
  };
}

/**
 * Get all filter selectors for UI interaction
 *
 * @description Combined filter selectors for all search filters.
 * URL parameters are the primary filter mechanism; these selectors
 * are used when filters need to be applied via UI interaction.
 *
 * @deprecated Use individual selector functions instead for better tree-shaking
 */
export function getFilterSelectors(): {
  sort: Record<SearchSortType, string>;
  noteType: Record<SearchNoteType, string>;
  timeRange: Record<SearchTimeRange, string>;
  scope: Record<SearchScope, string>;
  location: Record<SearchLocation, string>;
} {
  return {
    sort: getSortSelectors(),
    noteType: getNoteTypeSelectors(),
    timeRange: getTimeRangeSelectors(),
    scope: getScopeSelectors(),
    location: getLocationSelectors(),
  };
}
