/**
 * URL Extraction Types
 *
 * @module actions/shared/url-types
 * @description Type definitions for URL extraction - used across interact and scrape modules
 */

/** Result of extracting video ID from URL */
export interface VideoIdExtraction {
  /** Successfully extracted */
  success: boolean;
  /** Extracted video ID if found */
  videoId?: string;
  /** Error message if failed */
  error?: string;
}

/** Result of extracting user ID from URL */
export interface UserIdExtraction {
  /** Successfully extracted */
  success: boolean;
  /** Extracted user ID if found */
  userId?: string;
  /** Error message if failed */
  error?: string;
}

/** Generic result of extracting an ID from URL (internal use) */
export interface UrlExtractionResult {
  /** Successfully extracted */
  success: boolean;
  /** Extracted ID if found */
  id?: string;
  /** Error message if failed */
  error?: string;
}
