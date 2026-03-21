/**
 * Cookie module types
 *
 * @module cookie/types
 * @description Type definitions for cookie management
 */

// ============================================
// Cookie Entry
// ============================================

/** Single cookie entry */
export interface CookieEntry {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
}

// ============================================
// Cookie Storage
// ============================================

/** Cookie storage format */
export interface CookieStorage {
  cookies: CookieEntry[];
  savedAt?: string;
}
