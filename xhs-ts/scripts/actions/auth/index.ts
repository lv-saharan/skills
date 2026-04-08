/**
 * Auth Module - Unified Entry Point
 *
 * @module actions/auth
 * @description Authentication state management (detection and verification only)
 *
 * This module provides the SINGLE source of truth for:
 * - Login state detection (ensureLoginStatus)
 * - Session verification (verifySession)
 * - Error page detection (checkErrorPage)
 *
 * IMPORTANT: This module does NOT perform login operations.
 * For login actions, use login/auto-login.ts or login/execute.ts
 */

// ============================================
// Error Page Detection
// ============================================

export { checkErrorPage } from './check-error';

export type { ErrorPageResult } from './check-error';

// ============================================
// Login State Detection
// ============================================

export { ensureLoginStatus, ensureLoginStatusWithTrigger } from './ensure-status';

export type { EnsureLoginStatusResult } from './ensure-status';

// ============================================
// Session Verification
// ============================================

export { verifySession } from './verify-session';
