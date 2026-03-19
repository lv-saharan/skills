/**
 * Type definitions for xhs-ts
 *
 * @module types
 * @description Shared TypeScript types used across the application
 */

// ============================================
// Error Types
// ============================================

/** Standard error codes for CLI output */
export const XhsErrorCode = {
  NOT_LOGGED_IN: 'NOT_LOGGED_IN',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  NETWORK_ERROR: 'NETWORK_ERROR',
  CAPTCHA_REQUIRED: 'CAPTCHA_REQUIRED',
  COOKIE_EXPIRED: 'COOKIE_EXPIRED',
  LOGIN_FAILED: 'LOGIN_FAILED',
  BROWSER_ERROR: 'BROWSER_ERROR',
} as const;

export type XhsErrorCodeType = (typeof XhsErrorCode)[keyof typeof XhsErrorCode];

/** Custom error class with error code */
export class XhsError extends Error {
  constructor(
    message: string,
    public readonly code: XhsErrorCodeType,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'XhsError';
  }
}

// ============================================
// Cookie Types
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

/** Cookie storage format */
export interface CookieStorage {
  cookies: CookieEntry[];
  savedAt?: string;
}

// ============================================
// Login Types
// ============================================

/** Login method options */
export type LoginMethod = 'qr' | 'sms';

/** Login options */
export interface LoginOptions {
  method: LoginMethod;
  headless?: boolean;
  timeout?: number;
}

/** Login result */
export interface LoginResult {
  success: boolean;
  message: string;
  cookieSaved?: boolean;
}

/** QR code output for headless mode (consumed by OpenClaw) */
export interface QrCodeOutput {
  type: 'qr_login';
  status: 'waiting_scan';
  qrPath: string; // Absolute path to QR code image file
  message: string;
}

// ============================================
// Browser Types
// ============================================

/** Browser launch options */
export interface BrowserLaunchOptions {
  headless?: boolean;
  proxy?: string;
  browserPath?: string;
}

// ============================================
// CLI Output Types
// ============================================

/** Standard success response */
export interface SuccessResponse<T = unknown> {
  success: true;
  data: T;
}

/** Standard error response */
export interface ErrorResponse {
  error: true;
  message: string;
  code: XhsErrorCodeType;
  details?: unknown;
}

/** Union type for CLI output */
export type CliOutput<T = unknown> = SuccessResponse<T> | ErrorResponse;

// ============================================
// Search Types
// ============================================

/** Sort type for search results */
export type SearchSortType = 'hot' | 'time' | 'general';

/** Search options */
export interface SearchOptions {
  keyword: string;
  limit?: number;
  sort?: SearchSortType;
  headless?: boolean;
}

/** Author info in search result */
export interface SearchResultAuthor {
  id: string;
  name: string;
  url?: string;
}

/** Note stats */
export interface NoteStats {
  likes: number;
  collects: number;
  comments: number;
}

/** Single search result note */
export interface SearchResultNote {
  id: string;
  title: string;
  author: SearchResultAuthor;
  stats: NoteStats;
  cover?: string;
  url: string;
  xsecToken?: string;
}

/** Search result output */
export interface SearchResult {
  keyword: string;
  total: number;
  notes: SearchResultNote[];
}

// ============================================
// Config Types
// ============================================

/** Application configuration from environment */
export interface AppConfig {
  proxy: string | undefined;
  headless: boolean;
  browserPath: string | undefined;
  debug: boolean;
  loginTimeout: number;
  loginMethod: LoginMethod;
}
