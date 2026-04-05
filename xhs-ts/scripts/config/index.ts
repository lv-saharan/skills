/**
 * Config module entry
 *
 * @module config
 * @description Configuration layer for Xiaohongshu automation.
 *              Contains: JSON config loader, platform errors, environment config.
 *
 * NOTE: Session management has been moved to actions/shared/session.ts
 *       Import from 'actions/shared' for session utilities.
 */

// ============================================
// JSON Configuration Loader
// ============================================

export {
  platform,
  urls,
  domain,
  timeouts,
  delays,
  stealthDelays,
  selectors,
  errors,
  messages,
  isPlatformUrl,
  isCreatorUrl,
  getLoginSelectorArray,
  getQrSelectorArray,

  // Backward compatibility aliases (UPPERCASE)
  PLATFORM_CONFIG,
  XHS_URLS,
  PLATFORM_URLS,
  isXhsUrl,
  TIMEOUTS,
  DELAYS,
  STEALTH_DELAYS,
  LOGIN_BUTTON_SELECTORS,
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  QR_SELECTORS,
  QR_TAB_SELECTOR,
  LOGIN_MODAL_SELECTORS,
} from './loader';

// ============================================
// Platform Errors
// ============================================

export { XhsError, XhsErrorCode, type XhsErrorCodeType } from './errors';

// ============================================
// Session Orchestration (Re-export for backward compatibility)
// ============================================
//
// @deprecated Import from 'actions/shared' instead.
// These are re-exported for backward compatibility only.
//

export {
  withSession,
  withAuthenticatedAction,
  navigateTo,
  checkPageHealth,
  preparePageForAction,
  executeBatch,
  waitForStable,
  humanScroll,
  INTERACTION_DELAYS,
  type SessionContext,
  type SessionOptions,
  type BatchOptions,
} from './session';

// Additional utilities from session.ts (platform-specific)
export { checkErrorPage, ensureLoginStatus, simulateReading } from './session';

// ============================================
// Environment Configuration
// ============================================

export {
  config,
  validateConfig,
  getProjectRoot,
  getUsersDir,
  getTmpDir,
  getTmpFilePath,
  generateTimestamp,
  generateFileName,
} from './config';

// ============================================
// Types
// ============================================

export type {
  PlatformConfig,
  SelectorsConfig,
  ErrorsConfig,
  MessagesConfig,
  DelayConfig,
  RangeConfig,
  LoginMethod,
  AppConfig,
} from './types';

// ============================================
// Utilities (re-export from core/utils for backward compatibility)
// ============================================
//
// @deprecated Import directly from 'core/utils' instead.
// These are re-exported for backward compatibility only.
// New code should use: import { delay, debugLog } from '../../core/utils';
//

export {
  delay,
  randomDelay,
  gaussianDelay,
  waitForCondition,
  retry,
  debugLog,
  outputSuccess,
  outputError,
  outputQrCode,
  outputFromError,
} from '../core/utils';
