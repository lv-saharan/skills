/**
 * Interact module types
 *
 * @module interact/types
 * @description Type definitions for interaction functionality (like, collect, comment, follow)
 */

import type { UserName } from '../user';

// ============================================
// Like Options
// ============================================

/** Like note(s) options - unified for single and multiple URLs */
export interface LikeOptions {
  /** Note URLs (one or more) */
  urls: string[];
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
  /** Delay between likes in ms (default: 2000) */
  delayBetweenLikes?: number;
}

// ============================================
// Like Result
// ============================================

/** Like operation result */
export interface LikeResult {
  /** Operation success */
  success: boolean;
  /** Note URL */
  url: string;
  /** Note ID extracted from URL */
  noteId: string;
  /** Current like status after operation */
  liked: boolean;
  /** Was already liked before operation (skipped clicking) */
  alreadyLiked?: boolean;
  /** Error message if failed */
  error?: string;
  /** User name that performed the action */
  user?: UserName;
}

/** Like many operation result */
export interface LikeManyResult {
  /** Total URLs processed */
  total: number;
  /** Successful likes (newly liked) */
  succeeded: number;
  /** Already liked (skipped) */
  skipped: number;
  /** Failed likes */
  failed: number;
  /** Individual results */
  results: LikeResult[];
  /** User name that performed the action */
  user?: UserName;
}

// ============================================
// Note ID Extraction
// ============================================

/** Result of extracting note ID from URL */
export interface NoteIdExtraction {
  /** Successfully extracted */
  success: boolean;
  /** Note ID if found */
  noteId?: string;
  /** Error message if failed */
  error?: string;
}
