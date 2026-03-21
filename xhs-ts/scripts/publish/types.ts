/**
 * Publish module types
 *
 * @module publish/types
 * @description Type definitions for publish functionality
 */

// ============================================
// Media Type
// ============================================

/** Media type for publishing */
export type PublishMediaType = 'image' | 'video';

// ============================================
// Publish Options
// ============================================

/** Publish options */
export interface PublishOptions {
  /** Note title (required, max 20 chars) */
  title: string;
  /** Note content (required, max 1000 chars) */
  content: string;
  /** Media file paths - 1-9 images or 1 video (required) */
  mediaPaths: string[];
  /** Tags (optional, max 10 tags, each max 10 chars) */
  tags?: string[];
  /** Headless mode override */
  headless?: boolean;
}

// ============================================
// Publish Result
// ============================================

/** Publish result */
export interface PublishResult {
  success: boolean;
  /** Note ID on success */
  noteId?: string;
  /** Note URL on success */
  noteUrl?: string;
  message: string;
}

// ============================================
// Media Validation
// ============================================

/** Media validation result */
export interface MediaValidation {
  valid: boolean;
  type: PublishMediaType;
  error?: string;
}
