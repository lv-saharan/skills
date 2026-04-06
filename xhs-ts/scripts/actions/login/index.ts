/**
 * Login module
 *
 * @module login
 * @description Handle user authentication via QR code or SMS
 *
 * NOTE: ensureLogin is now exported from actions/shared/session.ts
 * for better module separation. This module re-exports for backward compatibility.
 */

// Main functions
export { executeLogin, checkLogin } from './execute';

// Auto-login flow (re-exported from shared/session for backward compatibility)
export { ensureLogin, type EnsureLoginOptions, type EnsureLoginResult } from '../shared/session';

// Individual login methods (for advanced usage)
export { qrLogin, waitForQrScan, captureQrCodeToFile } from './qr';
export { smsLogin, smsLoginWithCode } from './sms';
export { verifyExistingSession } from './verify';

// Selectors
export {
  LOGIN_SELECTORS,
  QR_SELECTORS,
  QR_TAB_SELECTOR,
  SMS_SELECTORS,
  LOGIN_BUTTON_SELECTORS,
  LOGIN_MODAL_SELECTOR,
  USER_COMPONENT_SELECTOR,
  LOGIN_MODAL_SELECTORS,
} from './selectors';
export type { LoginSelectors } from './selectors';

// Types
export type { LoginMethod, LoginOptions, LoginResult } from './types';

// Re-export QrCodeOutput from utils/output for convenience
export type { QrCodeOutput } from '../../core/utils/output';
