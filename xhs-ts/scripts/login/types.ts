/**
 * Login module types
 *
 * @module login/types
 * @description Type definitions for login functionality
 */

import type { LoginMethod } from '../shared';

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
}

// ============================================
// Login Result
// ============================================

/** Login result */
export interface LoginResult {
  success: boolean;
  message: string;
  cookieSaved?: boolean;
}
