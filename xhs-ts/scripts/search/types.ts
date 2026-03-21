/**
 * Search module types
 *
 * @module search/types
 * @description Type definitions for search functionality
 */

// ============================================
// Search Sort Type
// ============================================

/** Sort type for search results */
export type SearchSortType = 'hot' | 'time' | 'general';

// ============================================
// Search Options
// ============================================

/** Search options */
export interface SearchOptions {
  /** Search keyword */
  keyword: string;
  /** Number of results to return */
  limit?: number;
  /** Sort type */
  sort?: SearchSortType;
  /** Headless mode override */
  headless?: boolean;
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
  total: number;
  notes: SearchResultNote[];
}
