/**
 * CLI Command Options Type Definitions
 */

export interface CliLoginOptions {
  headless?: boolean;
  timeout?: string;
  user?: string;
}

export interface CliLikeOptions {
  headless?: boolean;
  user?: string;
  delay?: string;
}

export interface CliCollectOptions {
  headless?: boolean;
  user?: string;
  delay?: string;
}

export interface CliUserOptions {
  setCurrent?: string;
}

export interface CliFollowOptions {
  headless?: boolean;
  user?: string;
  delay?: string;
}

/**
 * Search video command options
 * Uses semantic filter values
 */
export interface CliSearchVideoOptions {
  headless?: boolean;
  user?: string;
  /** Sort type: comprehensive|most-likes|latest */
  sortType?: string;
  /** Publish time: unlimited|one-day|one-week|six-months */
  publishTime?: string;
  limit?: string;
}

/**
 * Search user command options
 * Uses semantic filter values
 */
export interface CliSearchUserOptions {
  headless?: boolean;
  user?: string;
  /** User type: all|common|enterprise|verified */
  userType?: string;
  /** Follower count: all|under-1k|1k-10k|10k-100k|100k-1m|over-1m */
  followers?: string;
  limit?: string;
}
