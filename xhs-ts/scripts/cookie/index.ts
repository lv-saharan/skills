/**
 * Cookie module
 *
 * @module cookie
 * @description Load, save, and validate cookies for persistent sessions
 */

// Storage operations
export {
  loadCookies,
  loadAndValidateCookies,
  addCookiesToContext,
  saveCookies,
  deleteCookies,
  getCookiePath,
  cookieExists,
  extractCookies,
} from './storage';

// Validation operations
export { validateCookies, hasRequiredCookies, getCookie } from './validation';

// Types
export type { CookieEntry, CookieStorage } from './types';
