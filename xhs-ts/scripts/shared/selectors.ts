/**
 * Shared selectors
 *
 * @module shared/selectors
 * @description Common CSS selectors used across modules
 */

// ============================================
// Login Selectors
// ============================================

/** QR code image selectors */
export const QR_SELECTORS: string[] = ['img.qrcode-img', '.qrcode-img'];

/** Login modal/container selectors */
export const LOGIN_MODAL_SELECTORS: string[] = ['.login-container'];

/** Login modal selector (single) */
export const LOGIN_MODAL_SELECTOR = '.login-container';

/** Login button selectors (to trigger login modal) */
export const LOGIN_BUTTON_SELECTORS: string[] = ['button.login-btn', '.login-btn'];

/** QR code tab selector */
export const QR_TAB_SELECTOR = '[class*="qrcode-tab"], button:has-text("扫码")';

/** User component selector (logged in indicator) */
export const USER_COMPONENT_SELECTOR = '.user.side-bar-component';
