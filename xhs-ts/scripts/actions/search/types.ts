/**
 * Search module types
 *
 * @module search/types
 * @description Type definitions for search functionality
 */

import type { UserName } from '../../user';

// ============================================
// Search Sort Type
// ============================================

/** Sort type for search results */
export type SearchSortType = 'general' | 'time_descending' | 'hot';

// ============================================
// Note Type Filter
// ============================================

/** Note type filter */
export type SearchNoteType = 'all' | 'image' | 'video';

// ============================================
// Time Range Filter
// ============================================

/** Time range filter for search */
export type SearchTimeRange = 'all' | 'day' | 'week' | 'month';

// ============================================
// Search Scope Filter
// ============================================

/** Search scope filter */
export type SearchScope = 'all' | 'following';

// ============================================
// Location Distance Filter
// ============================================

/** Location distance filter */
export type SearchLocation = 'all' | 'nearby' | 'city';

// ============================================
// Search Options
// ============================================

/** Search options */
export interface SearchOptions {
  /** Search keyword */
  keyword: string;
  /** Number of results to return (default: 10, max: 100) */
  limit?: number;
  /** Number of results to skip (default: 0) */
  skip?: number;
  /** Sort type (default: general) */
  sort?: SearchSortType;
  /** Note type filter (default: all) */
  noteType?: SearchNoteType;
  /** Time range filter (default: all) */
  timeRange?: SearchTimeRange;
  /** Search scope filter (default: all) */
  scope?: SearchScope;
  /** Location distance filter (default: all) */
  location?: SearchLocation;
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
}

// ============================================
// Search Result Types
// ============================================

/** Author info in search result */
export interface SearchResultAuthor {
  id: string;
  name: string;
  url?: string;
}

/** Note stats */
export interface NoteStats {
  likes: number;
  collects: number;
  comments: number;
}

/** Single search result note */
export interface SearchResultNote {
  id: string;
  title: string;
  author: SearchResultAuthor;
  stats: NoteStats;
  cover?: string;
  url: string;
  xsecToken?: string;
}

/** Search result output */
export interface SearchResult {
  keyword: string;
  /** Number of results requested by user */
  requested: number;
  /** Number of results actually returned */
  total: number;
  notes: SearchResultNote[];
  /** User name that performed the search */
  user?: UserName;
  /** Applied filters for reference */
  filters?: {
    sort?: SearchSortType;
    noteType?: SearchNoteType;
    timeRange?: SearchTimeRange;
    scope?: SearchScope;
    location?: SearchLocation;
  };
}
