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
export { executeScrapeNote, extractNoteIdFromUrl } from './note';

// Types
export type {
  ScrapeNoteOptions,
  ScrapeNoteResult,
  ScrapeNoteAuthor,
  ScrapeNoteStats,
  ScrapeNoteVideo,
  ScrapeNoteComment,
  NoteIdExtraction,
  CliScrapeNoteOptions,
} from './types';

// ============================================
// User Scraping
// ============================================

// Main function
export { executeScrapeUser, extractUserIdFromUrl } from './user';

// Types
export type {
  ScrapeUserOptions,
  ScrapeUserResult,
  ScrapeUserStats,
  ScrapeUserRecentNote,
  UserIdExtraction,
  CliScrapeUserOptions,
} from './types';

// ============================================
// Selectors (for advanced usage)
// ============================================

export { NOTE_SELECTORS, USER_SELECTORS, ERROR_SELECTORS } from './selectors';
