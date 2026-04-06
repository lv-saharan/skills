/**
 * Shared Module - Unified utilities for all Xiaohongshu actions
 *
 * @module actions/shared
 * @description This is the SINGLE source of truth for:
 *              - Session management (withSession, withAuthenticatedAction)
 *              - Page utilities (navigateTo, checkPageHealth, preparePageForAction)
 *              - Batch operations (executeBatch)
 *              - Human simulation (humanScroll, waitForStable)
 *
 * All actions should import from this module for session handling.
 */

// ============================================
// Session Management (Primary API)
// ============================================

export {
  withSession,
  withAuthenticatedAction,
  type SessionContext,
  type SessionOptions,
  type AuthenticatedActionOptions,
} from './session';

// ============================================
// Page Utilities
// ============================================

export { navigateTo, checkPageHealth, preparePageForAction } from './session';

// ============================================
// Batch Operations
// ============================================

export { executeBatch, type BatchOptions } from './session';

// ============================================
// Human Simulation
// ============================================

export { waitForStable, humanScroll } from './session';

// ============================================
// Constants
// ============================================

export { INTERACTION_DELAYS } from './session';

// ============================================
// Re-export from other modules for convenience
// ============================================

// URL utilities (now in shared)
export {
  extractNoteId,
  extractNoteIdFromUrl,
  extractUserId,
  extractUserIdFromUrl,
} from './url-utils';

// Delay utilities (from core)\r\nexport { delay, randomDelay, gaussianDelay } from '../../core/utils';\r\n\r\n// ============================================\r\n// Human-like Interaction Utilities\r\n// ============================================\r\n\r\nexport {\r\n  humanType,\r\n  retryWithHesitation,\r\n  type HumanTypeOptions,\r\n  type HumanScrollOptions,\r\n  type RetryOptions,\r\n} from '../../core/anti-detect';

// ============================================
// Shared Selectors
// ============================================

export {
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  LOGIN_BUTTON_SELECTORS,
  QR_CODE_SELECTORS,
  QR_TAB_SELECTOR,
  LOGIN_MODAL_SELECTORS,
} from './selectors';
