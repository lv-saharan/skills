/**
 * Scrape module
 *
 * @module scrape
 * @description Data scraping functionality for Xiaohongshu notes and user profiles
 */

// ============================================
// Note Scraping
// ============================================

// Main function
export { executeScrapeNote } from './note';
export { extractNoteIdFromUrl } from '../interact/url-utils';

// Types
export type {
  ScrapeNoteOptions,
  ScrapeNoteResult,
  ScrapeNoteAuthor,
  ScrapeNoteStats,
  ScrapeNoteVideo,
  ScrapeNoteComment,
  NoteIdExtraction,
} from './types';

// ============================================
// User Scraping
// ============================================

// Main function
export { executeScrapeUser } from './user';
export { extractUserIdFromUrl } from '../interact/url-utils';

// Types
export type {
  ScrapeUserOptions,
  ScrapeUserResult,
  ScrapeUserStats,
  ScrapeUserRecentNote,
  UserIdExtraction,
} from './types';

// ============================================
// Selectors (for advanced usage)
// ============================================

export { NOTE_SELECTORS, USER_SELECTORS, ERROR_SELECTORS } from './selectors';
