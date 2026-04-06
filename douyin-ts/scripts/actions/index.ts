/**
 * Actions Module - Unified Entry Point
 *
 * @module actions
 * @description All Douyin automation actions
 */

// ============================================
// Login Actions
// ============================================

export { executeLogin, checkLogin } from './login';
export type { LoginMethod, LoginOptions, LoginResult } from './login';

// ============================================
// Interact Actions
// ============================================

export { executeLike, executeCollect, executeFollow, extractNoteId, extractUserId } from './interact';
export type { LikeOptions, LikeResult, CollectOptions, FollowOptions } from './interact';

export {
  NOTE_SELECTORS,
  LIKE_SELECTORS,
  COLLECT_SELECTORS,
  FOLLOW_SELECTORS,
  SEARCH_SELECTORS,
  SEARCH_URLS,
} from './interact/selectors';

// ============================================
// Search Actions
// ============================================

export { executeSearchVideo, executeSearchUser } from './search';
export type {
  VideoSearchOptions,
  VideoSearchResult,
  VideoSortTypeValue,
  PublishTimeValue,
  UserSearchOptions,
  UserSearchResult,
} from './search';

export { VideoSortType, PublishTimeType } from './search';

// ============================================
// Shared Session Management
// ============================================

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
} from './shared/session';

export type {
  SessionContext,
  SessionOptions,
  AuthenticatedActionOptions,
  EnsureLoginOptions,
  EnsureLoginResult,
  BatchOptions,
} from './shared/session';

// ============================================
// Browser Launcher
// ============================================

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
} from './shared/browser-launcher';

export type {
  ProfileLaunchOptions,
  ProfileBrowserResult,
  StealthBehaviorConfig,
} from './shared/browser-launcher';

// ============================================
// Selectors and Constants
// ============================================

export {
  LOGIN_BUTTON_SELECTORS,
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  QR_CODE_SELECTORS,
  QR_TAB_SELECTOR,
  DY_URLS,
  TIMEOUTS,
  DELAYS,
} from './shared/selectors';
