/**
 * Shared Module - Unified utilities for all Xiaohongshu actions
 *
 * @module actions/shared
 * @description This is the SINGLE source of truth for:
 *              - Session management (withSession, withAuthenticatedAction)
 *              - Page preparation (preparePageForAction, checkPageHealth)
 *              - URL utilities (extractNoteIdFromUrl, extractUserIdFromUrl)
 *              - Browser launching (withProfile, launchProfileBrowser)
 *              - Cross-module selectors
 *
 * All actions should import from this module for session handling.
 */

// ============================================
// Session Management (Primary API)
// ============================================

export { withSession, withAuthenticatedAction, INTERACTION_DELAYS } from './session';

export type {
  SessionContext,
  SessionOptions,
  AuthenticatedActionOptions,
  PageErrorType,
  PreparePageResult,
} from './session';

// ============================================
// Page Preparation (Unified API)
// ============================================

export { preparePageForAction, navigateTo, checkPageHealth, checkContentErrors } from './page-prep';

export type { PageHealthStatus, PreparePageOptions } from './page-prep';

// ============================================
// Browser Launcher
// ============================================

export {
  launchProfileBrowser,
  withProfile,
  randomStealthDelay,
  hasBrowserInstance,
  getBrowserPort,
  closeBrowserInstance,
  checkServerConnection,
  loadConnectionInfo,
  saveConnectionInfo,
  clearConnectionInfo,
} from './browser-launcher';

export type {
  ProfileLaunchOptions,
  ProfileBrowserResult,
  StealthBehaviorConfig,
} from './browser-launcher';

// ============================================
// URL Utilities (Single Source)
// ============================================

export {
  extractNoteId,
  extractNoteIdFromUrl,
  extractUserId,
  extractUserIdFromUrl,
} from './url-utils';

// ============================================
// Selectors (Cross-Module)
// ============================================

export { LOGIN_MODAL_SELECTOR, USER_COMPONENT_SELECTOR, LOGIN_BUTTON_SELECTORS } from './selectors';

// ============================================
// Auto Login (moved from login/auto-login.ts)
// ============================================

export { autoLogin } from './auto-login';

export type { AutoLoginOptions, AutoLoginResult } from './auto-login';
