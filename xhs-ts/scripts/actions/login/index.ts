/**
 * Login module
 *
 * @module login
 * @description Handle user authentication via QR code or SMS
 */

// Main functions
export { executeLogin, checkLogin } from './execute';

// Auto-login flow
export { ensureLogin } from './auto-login';
export type { EnsureLoginOptions, EnsureLoginResult } from './auto-login';

// Individual login methods (for advanced usage)
export { qrLogin, waitForQrScan, captureQrCodeToFile } from './qr';
export { smsLogin } from './sms';
export { verifyExistingSession } from './verify';

// Types
export type { LoginMethod, LoginOptions, LoginResult } from './types';

// Re-export QrCodeOutput from utils/output for convenience
export type { QrCodeOutput } from '../../core/utils/output';
