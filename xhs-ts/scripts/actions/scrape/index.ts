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

// Types
export type {
  ScrapeUserOptions,
  ScrapeUserResult,
  ScrapeUserStats,
  ScrapeUserRecentNote,
  UserIdExtraction,
} from './types';

// ============================================
