/**
 * Login module types
 *
 * @module login/types
 * @description Type definitions for login functionality
 */

import type { UserName } from '../../user';
import type { LoginMethod } from '../../config';

// Re-export LoginMethod for convenience
export type { LoginMethod } from '../../config';

// ============================================
// Login Options
// ============================================

/** Login options */
export interface LoginOptions {
  /** Login method: 'qr', 'sms', or 'cookie' */
  method: LoginMethod;
  /** Headless mode override */
  headless?: boolean;
  /** Login timeout in milliseconds */
  timeout?: number;
  /** Login to creator center instead of main site */
  creator?: boolean;
  /** User name for multi-user support */
  user?: UserName;
  /** Phone number for SMS login */
  phone?: string;
  /** Cookie string for cookie login (format: "name1=value1; name2=value2") */
  cookieString?: string;
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
  /** Phone number for SMS login */
  phone?: string;
}
