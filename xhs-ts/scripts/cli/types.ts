/**
 * CLI Command Options Type Definitions
 *
 * @module cli/types
 * @description Type definitions for CLI command options
 *
 * NOTE: Positional arguments (url, urls, text, keyword) are NOT included in these interfaces.
 * They are passed as separate parameters to action handlers.
 */

// ============================================
// Base Interface
// ============================================

/**
 * Base command options - common to all commands with options
 *
 * NOTE: All boolean fields come from Commander.js flags (e.g., --headless)
 * They are `true` when flag is present, `undefined` otherwise.
 */
export interface BaseCommandOptions {
  /** Run in headless mode (--headless flag) */
  headless?: boolean;
  /** User name for multi-user support (--user <name>) */
  user?: string;
}

// ============================================
// Interact Module Commands
// ============================================

/**
 * Batch interact command options - for like, collect, follow
 * These commands operate on multiple URLs with optional delay.
 */
export interface BatchInteractCommandOptions extends BaseCommandOptions {
  /** Delay between actions in milliseconds (--delay <ms>) */
  delay?: string;
}

/** Like command options */
export interface LikeCommandOptions extends BatchInteractCommandOptions {}

/** Collect command options */
export interface CollectCommandOptions extends BatchInteractCommandOptions {}

/** Follow command options */
export interface FollowCommandOptions extends BatchInteractCommandOptions {}

/** Comment command options (single URL, no batch) */
export interface CommentCommandOptions extends BaseCommandOptions {
  // url and text are positional arguments, not in options
}

// ============================================
// Scrape Module Commands
// ============================================

/**
 * Scrape note command options
 * URL is passed as positional argument, not in options.
 */
export interface ScrapeNoteCommandOptions extends BaseCommandOptions {
  /** Include comments in result (--comments flag) */
  comments?: boolean;
  /** Max comments to include (--max-comments <number>) */
  maxComments?: string;
}

/**
 * Scrape user command options
 * URL is passed as positional argument, not in options.
 */
export interface ScrapeUserCommandOptions extends BaseCommandOptions {
  /** Include recent notes in result (--notes flag) */
  notes?: boolean;
  /** Max notes to include (--max-notes <number>) */
  maxNotes?: string;
}

// ============================================
// Other Commands
// ============================================

/**
 * Login command options
 */
export interface LoginCommandOptions extends BaseCommandOptions {
  /** Use QR code login (--qr flag) */
  qr?: boolean;
  /** Use SMS login (--sms flag) */
  sms?: boolean;
  /** Phone number for SMS login (--phone <number>) */
  phone?: string;
  /** Cookie string for cookie login (--cookie-string <string>) */
  cookieString?: string;
  /** Login to creator center (--creator flag) */
  creator?: boolean;
  /** Login timeout in milliseconds (--timeout <ms>) */
  timeout?: string;
}

/**
 * Search command options
 * Keyword is passed as positional argument, not in options.
 */
export interface SearchCommandOptions extends BaseCommandOptions {
  /** Number of results (--limit <number>) */
  limit?: string;
  /** Results to skip (--skip <number>) */
  skip?: string;
  /** Sort type (--sort <type>) */
  sort?: string;
  /** Note type filter (--note-type <type>) */
  noteType?: string;
  /** Time range filter (--time-range <range>) */
  timeRange?: string;
  /** Search scope (--scope <scope>) */
  scope?: string;
  /** Location filter (--location <location>) */
  location?: string;
}

/**
 * Publish command options
 */
export interface PublishCommandOptions extends BaseCommandOptions {
  /** Note title (--title <title>, required) */
  title: string;
  /** Note content (--content <content>, required) */
  content: string;
  /** Image paths, comma separated (--images <paths>) */
  images?: string;
  /** Video path (--video <path>) */
  video?: string;
  /** Tags, comma separated (--tags <tags>) */
  tags?: string;
}

/**
 * Browser command options
 */
export interface BrowserCommandOptions extends BaseCommandOptions {
  /** Start browser instance (--start flag) */
  start?: boolean;
  /** Stop all browser instances (--stop flag) */
  stop?: boolean;
  /** Stop browser for specific user (--stop-user <name>) */
  stopUser?: string;
  /** Show browser status (--status flag) */
  status?: boolean;
  /** List saved connections (--list flag) */
  list?: boolean;
}

/**
 * Browser status result - returned by getBrowserStatus()
 */
export interface BrowserStatusResult {
  total: number;
  alive: number;
  instances: Record<
    string,
    {
      port: number;
      pid?: number;
      headless?: boolean;
      lastActivityAt?: string;
      isAlive: boolean;
    }
  >;
}

/**
 * User command options (no base options - standalone)
 */
export interface UserCommandOptions {
  /** Set current user (--set-current <name>) */
  setCurrent?: string;
  /** Reset to default user (--set-default flag) */
  setDefault?: boolean;
  /** Clean up corrupted user data (--cleanup <name>) */
  cleanup?: string;
}
