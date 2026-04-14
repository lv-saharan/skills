/**
 * Auth Module - Unified Entry Point
 *
 * @module actions/auth
 * @description Authentication state management (detection, verification, and modal triggering)
 *
 * This module provides the SINGLE source of truth for:
 * - Login state detection (detectLoginStatus, isLoggedIn)
 * - Session verification (verifySession)
 * - Error page detection (checkErrorPage)
 * - Login modal triggering (triggerLoginModal)
 */

// ============================================
// Error Page Detection
// ============================================

export { checkErrorPage } from './check-error';

export type { ErrorPageResult } from './check-error';

// ============================================
// Login Status Detection
// ============================================

export { detectLoginStatus, isLoggedIn } from './status';

export type { LoginStatus } from './status';

// ============================================
// Login Modal Trigger
// ============================================

export { triggerLoginModal } from './modal-trigger';

export type { TriggerModalResult } from './modal-trigger';

// ============================================
// Session Verification
// ============================================

export { verifySession } from './verify-session';
