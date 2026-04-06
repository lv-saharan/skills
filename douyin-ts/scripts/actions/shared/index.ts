/**
 * Shared actions module
 *
 * @module actions/shared
 * @description Shared session management and utilities for all Douyin actions
 */

// Session management
export {
  withSession,
  withAuthenticatedAction,
  ensureLogin,
  navigateTo,
  checkPageHealth,
  preparePageForAction,
  executeBatch,
  waitForStable,
  humanScroll,
  ensureLoginStatus,
  checkErrorPage,
  randomStealthDelay,
  INTERACTION_DELAYS,
} from './session';

export type {
  SessionContext,
  SessionOptions,
  AuthenticatedActionOptions,
  EnsureLoginOptions,
  EnsureLoginResult,
  BatchOptions,
} from './session';

// Browser launcher
export {
  launchProfileBrowser,
  withProfile,
  hasCDPInstance,
  getCDPPort,
  closeCDPInstance,
  checkCDPConnection,
  loadConnectionInfo,
  saveConnectionInfo,
  clearConnectionInfo,
} from './browser-launcher';

export type {
  ProfileLaunchOptions,
  ProfileBrowserResult,
  StealthBehaviorConfig,
} from './browser-launcher';

// Selectors and constants
export {
  LOGIN_BUTTON_SELECTORS,
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  QR_CODE_SELECTORS,
  QR_TAB_SELECTOR,
  DY_URLS,
  TIMEOUTS,
  DELAYS,
} from './selectors';
