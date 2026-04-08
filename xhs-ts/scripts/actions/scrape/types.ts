/**
 * Scrape module types
 *
 * @module scrape/types
 * @description Type definitions for data scraping functionality
 */

import type { UserName } from '../../user';
import type { NoteIdExtraction, UserIdExtraction } from '../shared/url-types';

// Re-export extraction types for convenience
export type { NoteIdExtraction, UserIdExtraction };

// ============================================
// Note Scraping Types
// ============================================

/** Options for scraping note details */
export interface ScrapeNoteOptions {
  /** Note URL (must include xsec_token for full access) */
  url: string;
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
  /** Include comments in result (default: false) */
  includeComments?: boolean;
  /** Max comments to include (default: 20, max: 100) */
  maxComments?: number;
}

/** Author info in scraped note */
export interface ScrapeNoteAuthor {
  /** User ID */
  id: string;
  /** Display name */
  name: string;
  /** Avatar URL */
  avatar?: string;
  /** Profile URL */
  url?: string;
}

/** Stats in scraped note */
export interface ScrapeNoteStats {
  /** Like count */
  likes: number;
  /** Collect (bookmark) count */
  collects: number;
  /** Comment count */
  comments: number;
  /** Share count */
  shares: number;
}

/** Video info in scraped note */
export interface ScrapeNoteVideo {
  /** Video URL */
  url: string;
  /** Cover image URL */
  cover: string;
  /** Duration in seconds */
  duration?: number;
}

/** Comment in scraped note */
export interface ScrapeNoteComment {
  /** Comment ID */
  id: string;
  /** Author info */
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
  /** Comment content */
  content: string;
  /** Like count */
  likes: number;
  /** Comment time */
  time?: string;
  /** Is author reply */
  isAuthorReply?: boolean;
}

/** Result of scraping a note */
export interface ScrapeNoteResult {
  /** Operation success */
  success: boolean;
  /** Note ID */
  noteId: string;
  /** Original URL */
  url: string;
  /** Error message if failed */
  error?: string;

  // Core content
  /** Note title */
  title: string;
  /** Note content/description */
  content: string;
  /** Image URLs (for image notes) */
  images: string[];
  /** Video info (for video notes) */
  video?: ScrapeNoteVideo;
  /** Note type: image or video */
  type: 'image' | 'video';

  // Author
  /** Author info */
  author: ScrapeNoteAuthor;

  // Stats
  /** Engagement stats */
  stats: ScrapeNoteStats;

  // Metadata
  /** Tags/topics */
  tags: string[];
  /** Publish time */
  publishTime?: string;
  /** IP location */
  location?: string;
  /** At user (mentioned users) */
  atUsers?: Array<{ id: string; name: string }>;

  // Comments (optional)
  /** Comments (if requested) */
  comments?: ScrapeNoteComment[];
  /** Total comments count */
  totalComments?: number;

  // Timestamps
  /** Scrape time */
  scrapedAt: string;
  /** User that performed the scrape */
  user?: UserName;
}

// ============================================
// User Scraping Types
// ============================================

/** Options for scraping user profile */
export interface ScrapeUserOptions {
  /** User profile URL */
  url: string;
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
  /** Include recent notes preview (default: false) */
  includeNotes?: boolean;
  /** Max recent notes to include (default: 12, max: 50) */
  maxNotes?: number;
}

/** Stats in scraped user profile */
export interface ScrapeUserStats {
  /** Following count */
  follows: number;
  /** Fans/followers count */
  fans: number;
  /** Total likes received */
  liked: number;
  /** Notes count */
  notes: number;
}

/** Recent note preview in user profile */
export interface ScrapeUserRecentNote {
  /** Note ID */
  id: string;
  /** Cover image URL */
  cover: string;
  /** Note title */
  title?: string;
  /** Like count */
  likes: number;
  /** Note URL with xsec_token */
  url: string;
  /** Note type */
  type: 'image' | 'video';
}

/** Result of scraping a user profile */
export interface ScrapeUserResult {
  /** Operation success */
  success: boolean;
  /** User ID */
  userId: string;
  /** Original URL */
  url: string;
  /** Error message if failed */
  error?: string;

  // Profile
  /** Display name */
  name: string;
  /** Avatar URL */
  avatar?: string;
  /** Bio/description */
  bio?: string;
  /** IP location */
  location?: string;
  /** RED ID (unique identifier) */
  redId?: string;

  // Stats
  /** User stats */
  stats: ScrapeUserStats;

  // Tags
  /** User-defined tags */
  tags?: string[];

  // Recent notes (optional)
  /** Recent notes preview (if requested) */
  recentNotes?: ScrapeUserRecentNote[];

  // Timestamps
  /** Scrape time */
  scrapedAt: string;
  /** User that performed the scrape */
  user?: UserName;
}
