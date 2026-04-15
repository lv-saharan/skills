/**
 * Actions Module - Unified Entry Point
 *
 * @module actions
 * @description All Douyin automation actions
 *
 * This module provides a single entry point for all action modules.
 * CLI commands should import from here for better module separation.
 */

// ============================================
// Auth - Authentication State Management
// ============================================

export {
  detectLoginStatus,
  isLoggedIn,
  triggerLoginModal,
  checkErrorPage,
  verifySession,
} from './auth';

export type { LoginStatus, ErrorPageResult, TriggerModalResult } from './auth';

// ============================================
// Login Actions
// ============================================

export { executeLogin, autoLogin, qrLogin, smsLogin } from './login';

export type {
  LoginMethod,
  LoginOptions,
  LoginResult,
  AutoLoginOptions,
  AutoLoginResult,
  QrCodeOutput,
} from './login';

// ============================================
// Search Actions
// ============================================

export { executeSearch } from './search';

export type {
  SearchSortType,
  SearchNoteType,
  SearchTimeRange,
  SearchScope,
  SearchLocation,
  SearchOptions,
  SearchResult,
  SearchResultNote,
  SearchResultAuthor,
  NoteStats,
} from './search';

// ============================================
// Interact Actions
// ============================================

export { executeLike, executeCollect, executeComment, executeFollow } from './interact';

export type {
  LikeOptions,
  LikeResult,
  LikeManyResult,
  CollectOptions,
  CollectResult,
  CollectManyResult,
  CommentOptions,
  CommentResult,
  FollowOptions,
  FollowResult,
  FollowManyResult,
  NoteIdExtraction,
  UserIdExtraction,
} from './interact';

// ============================================
// Scrape Actions
// ============================================

export { executeScrapeNote, executeScrapeUser } from './scrape';

export type {
  ScrapeNoteOptions,
  ScrapeNoteResult,
  ScrapeUserOptions,
  ScrapeUserResult,
} from './scrape';

// ============================================
// Selectors - Unified Export
// ============================================

// Login/Auth selectors
export {
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  LOGIN_BUTTON_SELECTORS,
} from './shared/selectors';

// Login-specific selectors
export { LOGIN_SELECTORS, QR_SELECTORS, QR_TAB_SELECTOR, SMS_SELECTORS } from './login';
export type { LoginSelectors } from './login';

// ============================================
// Shared - Session Management
// ============================================

export { withSession, withAuthenticatedAction, INTERACTION_DELAYS } from './shared/session';

export type { SessionContext, SessionOptions, AuthenticatedActionOptions } from './shared/session';

// ============================================
// Shared - Page Preparation
// ============================================

export {
  preparePageForAction,
  navigateTo,
  checkPageHealth,
  checkContentErrors,
} from './shared/page-prep';

export type {
  PageHealthStatus,
  PageErrorType,
  PreparePageResult,
  PreparePageOptions,
} from './shared/page-prep';

// ============================================
// Shared - Browser Launcher
// ============================================

export {
  launchProfileBrowser,
  withProfile,
  randomStealthDelay,
  hasBrowserInstance,
  getBrowserPort,
  closeBrowserInstance,
  checkServerConnection,
  checkBrowserEndpointHealth,
  loadConnectionInfo,
  saveConnectionInfo,
  clearConnectionInfo,
} from './shared/browser-launcher';

export type {
  ProfileLaunchOptions,
  ProfileBrowserResult,
  StealthBehaviorConfig,
} from './shared/browser-launcher';
