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

// Navigation
export {
  navigateToSearch,
  isVerificationPage,
  hasSearchResults,
  searchViaHomepage,
  applyFiltersViaUI,
  SEARCH_CONTAINER_SELECTOR,
  NOTE_ITEM_SELECTOR,
} from './navigation';
export type { SearchFilters } from './navigation';

// Extraction helpers
export { hoverNotesForTokens, loadMoreResults, NOTES_PER_SCROLL } from './extraction';

// Result extractor
export { extractSearchResults } from './result-extractor';
