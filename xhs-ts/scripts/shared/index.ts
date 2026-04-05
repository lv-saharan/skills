/**
 * Shared module
 *
 * @module shared
 * @description Global shared types and utilities used across modules
 */

// Error types
export { XhsError, XhsErrorCode } from './errors';
export type { XhsErrorCodeType } from './errors';

// Shared types
export type { LoginMethod } from './types';

// Shared constants
export { TIMEOUTS, XHS_URLS, DELAYS, STEALTH_DELAYS } from './constants';

// Shared selectors
export {
  QR_SELECTORS,
  LOGIN_MODAL_SELECTORS,
  LOGIN_MODAL_SELECTOR,
  LOGIN_BUTTON_SELECTORS,
  QR_TAB_SELECTOR,
  USER_COMPONENT_SELECTOR,
} from './selectors';
