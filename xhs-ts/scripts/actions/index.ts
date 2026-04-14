/**
 * Actions Module - Unified Entry Point
 *
 * @module actions
 * @description All Xiaohongshu automation actions
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
  BuildSearchUrlOptions,
} from './search';

export { buildSearchUrl, navigateToSearch, isVerificationPage, hasSearchResults } from './search';

export { hoverNotesForTokens, loadMoreResults, NOTES_PER_SCROLL } from './search';

// ============================================
// Publish Actions
// ============================================

export { executePublish } from './publish';

export type { PublishMediaType, PublishOptions, PublishResult, MediaValidation } from './publish';

export {
  MAX_TITLE_LENGTH,
  MAX_CONTENT_LENGTH,
  MAX_IMAGES,
  MAX_TAGS,
  MAX_TAG_LENGTH,
  IMAGE_EXTENSIONS,
  VIDEO_EXTENSIONS,
  MAX_IMAGE_SIZE,
  MAX_VIDEO_SIZE,
  SELECTORS,
  CREATOR_PUBLISH_URL,
} from './publish';

export {
  uploadMedia,
  switchToUploadTab,
  isOnLoginPage,
  waitForUserLogin,
  waitForImageUpload,
  waitForVideoUpload,
} from './publish';

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
  ScrapeNoteAuthor,
  ScrapeNoteStats,
  ScrapeNoteVideo,
  ScrapeNoteComment,
  ScrapeUserOptions,
  ScrapeUserResult,
  ScrapeUserStats,
  ScrapeUserRecentNote,
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

// Note/User selectors
export {
  NOTE_SELECTORS,
  LIKE_SELECTORS,
  COLLECT_SELECTORS,
  COMMENT_SELECTORS,
  FOLLOW_SELECTORS,
  USER_SELECTORS,
} from './shared/selectors';

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
