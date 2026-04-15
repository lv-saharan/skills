/**
 * Scrape module
 *
 * @module scrape
 * @description Scrape functionality (note details, user profiles) for Douyin
 *
 * TODO: Implement Douyin-specific scrape logic.
 */

// Main functions
export { executeScrapeNote, executeScrapeUser } from './execute';

// Types
export type {
  ScrapeNoteOptions,
  ScrapeNoteResult,
  ScrapeUserOptions,
  ScrapeUserResult,
} from './types';
