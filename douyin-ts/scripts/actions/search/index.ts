/**
 * Search module
 *
 * @module search
 * @description Search videos by keyword with filtering options
 *
 * TODO: Implement Douyin-specific search logic.
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
