/**
 * Interact module types
 *
 * @module interact/types
 * @description Type definitions for interaction functionality (like, collect, comment, follow)
 */

import type { UserName } from '../../user';

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

// ============================================
// User ID Extraction
// ============================================

/** Result of extracting user ID from URL */
export interface UserIdExtraction {
  /** Successfully extracted */
  success: boolean;
  /** User ID if found */
  userId?: string;
  /** Error message if failed */
  error?: string;
}

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
// Collect Options
// ============================================

/** Collect note(s) options - unified for single and multiple URLs */
export interface CollectOptions {
  /** Note URLs (one or more) */
  urls: string[];
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
  /** Delay between collects in ms (default: 2000) */
  delayBetweenCollects?: number;
}

// ============================================
// Collect Result
// ============================================

/** Collect operation result */
export interface CollectResult {
  /** Operation success */
  success: boolean;
  /** Note URL */
  url: string;
  /** Note ID extracted from URL */
  noteId: string;
  /** Current collect status after operation */
  collected: boolean;
  /** Was already collected before operation (skipped clicking) */
  alreadyCollected?: boolean;
  /** Error message if failed */
  error?: string;
  /** User name that performed the action */
  user?: UserName;
}

/** Collect many operation result */
export interface CollectManyResult {
  /** Total URLs processed */
  total: number;
  /** Successful collects (newly collected) */
  succeeded: number;
  /** Already collected (skipped) */
  skipped: number;
  /** Failed collects */
  failed: number;
  /** Individual results */
  results: CollectResult[];
  /** User name that performed the action */
  user?: UserName;
}

// ============================================
// Comment Options
// ============================================

/** Comment on a note options */
export interface CommentOptions {
  /** Note URL (must include xsec_token) */
  url: string;
  /** Comment text to post */
  text: string;
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
}

// ============================================
// Comment Result
// ============================================

/** Comment operation result */
export interface CommentResult {
  /** Operation success */
  success: boolean;
  /** Note URL */
  url: string;
  /** Note ID extracted from URL */
  noteId: string;
  /** Comment text that was posted */
  text: string;
  /** Error message if failed */
  error?: string;
  /** User name that performed the action */
  user?: UserName;
}

// ============================================
// Follow Options
// ============================================

/** Follow user(s) options - unified for single and multiple URLs */
export interface FollowOptions {
  /** User profile URLs (one or more) */
  urls: string[];
  /** Headless mode override */
  headless?: boolean;
  /** User name for multi-user support */
  user?: UserName;
  /** Delay between follows in ms (default: 2000) */
  delayBetweenFollows?: number;
}

// ============================================
// Follow Result
// ============================================

/** Follow operation result */
export interface FollowResult {
  /** Operation success */
  success: boolean;
  /** User profile URL */
  url: string;
  /** User ID extracted from URL */
  userId: string;
  /** Current follow status after operation */
  following: boolean;
  /** Was already following before operation (skipped clicking) */
  alreadyFollowing?: boolean;
  /** Error message if failed */
  error?: string;
  /** User name that performed the action */
  user?: UserName;
}

/** Follow many operation result */
export interface FollowManyResult {
  /** Total URLs processed */
  total: number;
  /** Successful follows (newly followed) */
  succeeded: number;
  /** Already following (skipped) */
  skipped: number;
  /** Failed follows */
  failed: number;
  /** Individual results */
  results: FollowResult[];
  /** User name that performed the action */
  user?: UserName;
}
