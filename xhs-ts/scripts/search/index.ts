/**
 * Search module
 *
 * @module search
 * @description Search notes by keyword with filtering options
 */

// Main function
export { executeSearch } from './execute';

// Types
export type {
  SearchSortType,
  SearchNoteType,
  SearchTimeRange,
  SearchScope,
  SearchLocation,
  SearchOptions,
  SearchResult,
  SearchResultNote,
  SearchResultAuthor,
  NoteStats,
} from './types';

// URL builder
export { buildSearchUrl, getFilterSelectors } from './url-builder';
export type { BuildSearchUrlOptions } from './url-builder';

// Result extractor
export { extractSearchResults } from './result-extractor';
