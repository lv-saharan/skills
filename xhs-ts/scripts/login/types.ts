/**
 * Login module types
 *
 * @module login/types
 * @description Type definitions for login functionality
 */

import type { LoginMethod } from '../shared';
import type { UserName } from '../user';

// Re-export LoginMethod for convenience
export type { LoginMethod } from '../shared';

// ============================================
// Login Options
// ============================================

/** Login options */
export interface LoginOptions {
  /** Login method: 'qr' or 'sms' */
  method: LoginMethod;
  /** Headless mode override */
  headless?: boolean;
  /** Login timeout in milliseconds */
  timeout?: number;
  /** Login to creator center instead of main site */
  creator?: boolean;
  /** User name for multi-user support */
  user?: UserName;
}

// ============================================
// Login Result
// ============================================

/** Login result */
export interface LoginResult {
  success: boolean;
  message: string;
  cookieSaved?: boolean;
  /** User name that was logged in */
  user?: UserName;
}
