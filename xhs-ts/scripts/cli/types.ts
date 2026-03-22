/**
 * CLI Command Options Type Definitions
 *
 * @module cli/types
 * @description Type definitions for CLI command options (raw CLI inputs)
 */

/**
 * Login command options (CLI-specific, raw string inputs)
 */
export interface CliLoginOptions {
  /** Use QR code login */
  qr?: boolean;
  /** Use SMS login */
  sms?: boolean;
  /** Login to creator center */
  creator?: boolean;
  /** Run in headless mode */
  headless?: boolean;
  /** Login timeout in milliseconds (string from CLI) */
  timeout?: string;
}

/**
 * Search command options (CLI-specific, raw string inputs)
 */
export interface CliSearchOptions {
  /** Number of results to return (string from CLI) */
  limit: string;
  /** Sort by: general, time_descending, or hot */
  sort: 'general' | 'time_descending' | 'hot';
  /** Note type filter: all, image, or video */
  noteType?: 'all' | 'image' | 'video';
  /** Time range filter: all, day, week, or month */
  timeRange?: 'all' | 'day' | 'week' | 'month';
  /** Search scope filter: all or following */
  scope?: 'all' | 'following';
  /** Location filter: all, nearby, or city */
  location?: 'all' | 'nearby' | 'city';
  /** Run in headless mode */
  headless?: boolean;
}

/**
 * Publish command options (CLI-specific, raw string inputs)
 */
export interface CliPublishOptions {
  /** Note title (max 20 chars) */
  title: string;
  /** Note content (max 1000 chars) */
  content: string;
  /** Image paths, comma separated */
  images?: string;
  /** Video path (alternative to images) */
  video?: string;
  /** Tags, comma separated */
  tags?: string;
  /** Run in headless mode */
  headless?: boolean;
}

/**
 * Interaction command options (like, collect, comment, follow)
 */
export interface InteractOptions {
  /** Run in headless mode */
  headless?: boolean;
}
