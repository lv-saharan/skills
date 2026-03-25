/**
 * User module types
 *
 * @module user/types
 * @description Type definitions for multi-user management
 */

// ============================================
// User Name
// ============================================

/** User name = directory name */
export type UserName = string;

// ============================================
// User Information
// ============================================

/** User info derived from directory */
export interface UserInfo {
  /** User name (directory name) */
  name: UserName;
  /** Whether user has valid cookies */
  hasCookie: boolean;
}

// ============================================
// User List Result
// ============================================

/** User list result */
export interface UserListResult {
  /** All users */
  users: UserInfo[];
  /** Current user name */
  current: UserName;
}

// ============================================
// Users Metadata
// ============================================

/** users.json content */
export interface UsersMeta {
  /** Current user name */
  current: UserName;
  /** Data version for future migrations */
  version: number;
}
