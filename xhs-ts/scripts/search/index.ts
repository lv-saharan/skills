/**
 * Search module
 *
 * @module search
 * @description Search notes by keyword with sorting options
 */

// Main function
export { executeSearch } from './execute';

// Types
export type {
  SearchSortType,
  SearchOptions,
  SearchResult,
  SearchResultNote,
  SearchResultAuthor,
  NoteStats,
} from './types';
// URL builder
export { buildSearchUrl } from './url-builder';

// Result extractor
export { extractSearchResults } from './result-extractor';
