/**
 * Scrape module types
 *
 * @module scrape/types
 * @description Type definitions for scrape functionality
 */

import type { UserName } from '../../user';

// ============================================
// Scrape Note Options
// ============================================

/** Scrape note options */
export interface ScrapeNoteOptions {
  /** Note URL (must include xsec_token) */
  url: string;
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
  /** Include comments in scrape */
  includeComments?: boolean;
  /** Maximum comments to scrape (default: 20) */
  maxComments?: number;
}

// ============================================
// Scrape Note Result
// ============================================

/** Scrape note result */
export interface ScrapeNoteResult {
  /** Note ID */
  noteId: string;
  /** Note title */
  title: string;
  /** Note content/description */
  content: string;
  /** Note images */
  images?: string[];
  /** Note video URL */
  video?: string;
  /** Author info */
  author: {
    id: string;
    name: string;
    url: string;
  };
  /** Stats */
  stats: {
    likes: number;
    collects: number;
    comments: number;
    shares: number;
  };
  /** Tags */
  tags?: string[];
  /** Publish time */
  publishTime?: string;
  /** Location */
  location?: string;
  /** Comments (if requested) */
  comments?: Array<{
    id: string;
    user: string;
    text: string;
    time: string;
  }>;
}

// ============================================
// Scrape User Options
// ============================================

/** Scrape user options */
export interface ScrapeUserOptions {
  /** User profile URL */
  url: string;
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
  /** Include recent notes */
  includeNotes?: boolean;
  /** Maximum notes to scrape (default: 12) */
  maxNotes?: number;
}

// ============================================
// Scrape User Result
// ============================================

/** Scrape user result */
export interface ScrapeUserResult {
  /** User ID */
  userId: string;
  /** User name */
  name: string;
  /** Avatar URL */
  avatar?: string;
  /** Bio/signature */
  bio?: string;
  /** Stats */
  stats: {
    following: number;
    followers: number;
    likes: number;
    notes: number;
  };
  /** Tags/labels */
  tags?: string[];
  /** Recent notes (if requested) */
  recentNotes?: Array<{
    id: string;
    title: string;
    cover?: string;
    likes: number;
    url: string;
  }>;
}
