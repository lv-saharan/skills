/**
 * Auto-login flow for seamless authentication
 *
 * @module login/auto-login
 * @description Automatically handle login when session is expired
 *
 * Flow:
 * - Check if user is already logged in
 * - If not logged in, trigger login modal and wait for QR scan
 * - QR code is captured and output for scanning (headless: saved to file, GUI: visible in browser)
 *
 * NOTE: Headless and GUI modes have identical login logic.
 * The only difference is how the CDP browser instance is launched (see core/browser/launcher.ts).
 *
 * DEPRECATED: This module now re-exports from actions/shared/session.ts
 * for better module separation. Import directly from shared/session.
 */

import {
  ensureLogin as sessionEnsureLogin,
  type EnsureLoginOptions,
  type EnsureLoginResult,
} from '../shared/session';

// ============================================
// Re-export for backward compatibility
// ============================================

/**
 * @deprecated Import from actions/shared/session instead
 */
export const ensureLogin = sessionEnsureLogin;
export type { EnsureLoginOptions, EnsureLoginResult };
