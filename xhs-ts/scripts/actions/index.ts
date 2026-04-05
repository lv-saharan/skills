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
// Login Actions
// ============================================

export {
  executeLogin,
  checkLogin,
  ensureLogin,
  qrLogin,
  smsLogin,
  verifyExistingSession,
  waitForQrScan,
  captureQrCodeToFile,
} from './login';

export type {
  LoginMethod,
  LoginOptions,
  LoginResult,
  EnsureLoginOptions,
  EnsureLoginResult,
  LoginSelectors,
  QrCodeOutput,
} from './login';

export {
  LOGIN_SELECTORS,
  QR_SELECTORS,
  QR_TAB_SELECTOR,
  SMS_SELECTORS,
  LOGIN_BUTTON_SELECTORS,
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  LOGIN_MODAL_SELECTORS,
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
  SearchFilters,
} from './search';

export {
  buildSearchUrl,
  getFilterSelectors,
  navigateToSearch,
  isVerificationPage,
  hasSearchResults,
  searchViaHomepage,
  applyFiltersViaUI,
} from './search';

export {
  hoverNotesForTokens,
  loadMoreResults,
  NOTES_PER_SCROLL,
  extractSearchResults,
} from './search';

// ============================================
// Publish Actions
// ============================================

export { executePublish } from './publish';

export type { PublishMediaType, PublishOptions, PublishResult, MediaValidation } from './publish';

export {
  validateMedia,
  validateContent,
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

export { fillTitle, fillContent, addTags } from './publish';

export {
  submitAndVerify,
  clickPublishButtonOnHomepage,
  navigateToPublishPageFromCreatorHome,
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

export {
  extractNoteId,
  extractNoteIdFromUrl,
  extractUserId,
  extractUserIdFromUrl,
} from './interact';

export { withAuthenticatedAction, executeBatch, INTERACTION_DELAYS } from './interact';

export {
  NOTE_SELECTORS,
  LIKE_SELECTORS,
  COLLECT_SELECTORS,
  COMMENT_SELECTORS,
  FOLLOW_SELECTORS,
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

export { NOTE_SELECTORS as SCRAPE_NOTE_SELECTORS, USER_SELECTORS, ERROR_SELECTORS } from './scrape';

// ============================================
// Shared Session Management
// ============================================

export {
  withSession,
  withAuthenticatedAction as withAuthenticatedActionSession,
  navigateTo,
  checkPageHealth,
  preparePageForAction,
  executeBatch as executeBatchSession,
  waitForStable,
  humanScroll,
  ensureLoginStatus,
  checkErrorPage,
} from './shared/session';

export type {
  SessionContext,
  SessionOptions,
  AuthenticatedActionOptions,
  BatchOptions,
} from './shared/session';

export { INTERACTION_DELAYS as SESSION_DELAYS } from './shared/session';

// ============================================
// Browser Launcher
// ============================================

export {
  launchProfileBrowser,
  withProfile,
  randomStealthDelay,
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
