/**
 * Login module
 *
 * @module login
 * @description Handle user authentication via QR code or SMS
 */

// Main function
export { executeLogin } from './execute';

// Auto login (re-exported from shared)
export { autoLogin } from '../shared/auto-login';
export type { AutoLoginOptions, AutoLoginResult } from '../shared/auto-login';

// Individual login methods (internal helpers also exported for auto-login)
export { qrLogin, waitForQrScan, triggerLoginModal } from './qr';
export { smsLogin } from './sms';
export { cookieLogin, parseCookieString, injectCookies } from './cookie';

// Selectors
export { LOGIN_SELECTORS, QR_SELECTORS, QR_TAB_SELECTOR, SMS_SELECTORS } from './selectors';
export type { LoginSelectors } from './selectors';

// Types
export type { LoginMethod, LoginOptions, LoginResult } from './types';

// Re-export QrCodeOutput
export type { QrCodeOutput } from '../../core/utils/output';
