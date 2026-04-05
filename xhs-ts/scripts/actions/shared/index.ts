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

// URL utilities (from interact)
export {
  extractNoteId,
  extractNoteIdFromUrl,
  extractUserId,
  extractUserIdFromUrl,
} from '../interact/url-utils';

// Delay utilities (from core)
export { delay, randomDelay, gaussianDelay } from '../../core/utils';
