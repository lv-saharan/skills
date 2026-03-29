/**
 * Login module
 *
 * @module login
 * @description Handle user authentication via QR code for Douyin
 */

// Main functions
export { executeLogin, checkLogin } from './execute';

// Individual login methods (for advanced usage)
export { qrLogin, waitForQrScan } from './qr';
export { verifyExistingSession } from './verify';

// Types
export type { LoginMethod, LoginOptions, LoginResult } from './types';

// Re-export QrCodeOutput from utils/output for convenience
export type { QrCodeOutput } from '../utils/output';