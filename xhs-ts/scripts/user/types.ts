/**
 * User module types
 *
 * @module user/types
 * @description Type definitions for multi-user management
 */

// ============================================
// User Name
// ============================================

/** User name = directory name */
export type UserName = string;

// ============================================
// Device Fingerprint Types
// ============================================

/** Device platform type */
export type DevicePlatform = 'Windows' | 'MacIntel' | 'Linux x86_64';

/** Screen configuration */
export interface ScreenConfig {
  width: number;
  height: number;
  colorDepth: 24 | 32;
}

/** Device hardware configuration */
export interface DeviceConfig {
  platform: DevicePlatform;
  hardwareConcurrency: number;
  deviceMemory: number;
}

/** WebGL configuration */
export interface WebGLConfig {
  vendor: string;
  renderer: string;
}

/** Browser configuration */
export interface BrowserConfig {
  userAgent: string;
  vendor: string;
  languages: string[];
}

/**
 * User device fingerprint configuration
 *
 * Binds device characteristics to a user account.
 * Same user always has the same fingerprint across sessions.
 */
export interface UserFingerprint {
  /** Fingerprint schema version */
  version: 1;

  /** Creation timestamp (ISO 8601) */
  createdAt: string;

  /** Device hardware configuration */
  device: DeviceConfig;

  /** Browser configuration */
  browser: BrowserConfig;

  /** WebGL configuration */
  webgl: WebGLConfig;

  /** Screen configuration */
  screen: ScreenConfig;

  /** Canvas noise seed for consistent canvas fingerprint noise */
  canvasNoiseSeed: number;

  /** Audio noise seed for consistent audio fingerprint noise */
  audioNoiseSeed: number;

  /** Optional: Description of the preset used */
  description?: string;
}

// ============================================
// User Information
// ============================================

/** User info derived from directory */
export interface UserInfo {
  /** User name (directory name) */
  name: UserName;
  /** Whether user has valid cookies */
  hasCookie: boolean;
  /** Whether user has fingerprint configured */
  hasFingerprint?: boolean;
}

// ============================================
// User List Result
// ============================================

/** User list result */
export interface UserListResult {
  /** All users */
  users: UserInfo[];
  /** Current user name */
  current: UserName;
}

// ============================================
// Users Metadata
// ============================================

/** users.json content */
export interface UsersMeta {
  /** Current user name */
  current: UserName;
  /** Data version for future migrations */
  version: number;
}
