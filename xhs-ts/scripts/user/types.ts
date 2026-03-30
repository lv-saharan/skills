/**
 * User module types
 *
 * @module user/types
 * @description Type definitions for multi-user management and Profile architecture
 */

// ============================================
// User Name
// ============================================

/** User name = directory name */
export type UserName = string;

// ============================================
// Environment Types (Task 1)
// ============================================

/**
 * Environment detection type
 *
 * - gui-native: Real GUI environment with display
 * - gui-virtual: Virtual GUI (e.g., Xvfb, WSLg)
 * - headless-smart: Headless with smart preset matching
 * - headless-custom: Headless with custom configuration
 */
export type EnvironmentType = 'gui-native' | 'gui-virtual' | 'headless-smart' | 'headless-custom';

/**
 * Fingerprint source type
 *
 * - preset: Generated from device presets
 * - real: Detected from real device characteristics
 * - custom: User-specified configuration
 */
export type FingerprintSource = 'preset' | 'real' | 'custom';

/**
 * Device profile detected from system
 */
export interface DeviceProfile {
  /** Device platform */
  platform: 'Windows' | 'MacIntel' | 'Linux x86_64';
  /** Number of CPU cores */
  hardwareConcurrency: number;
  /** Device memory in GB (rounded to common values: 4, 8, 16, 32) */
  deviceMemory: number;
}

/**
 * User environment information
 *
 * Captures the environment characteristics for fingerprint generation and debugging.
 */
export interface UserEnvironment {
  /** Detected environment type */
  type: EnvironmentType;
  /** Source of fingerprint data */
  fingerprintSource: FingerprintSource;
  /** Detected device characteristics */
  device: DeviceProfile;
  /** Description of preset used (if applicable) */
  presetDescription?: string;
}

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
  /** Whether user has Profile directory structure */
  hasProfile?: boolean;
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
// User Meta (Task 1 - Profile Architecture)
// ============================================

/**
 * User metadata stored in meta.json within each user's profile directory
 */
export interface UserMeta {
  /** Meta schema version */
  version: 1;
  /** User creation timestamp (ISO 8601) */
  createdAt: string;
  /** Last used timestamp (ISO 8601) */
  lastUsedAt: string;
  /** Environment type when profile was created */
  environmentType: EnvironmentType;
  /** Fingerprint source used */
  fingerprintSource: FingerprintSource;
  /** Description of preset used (if applicable) */
  presetDescription?: string;
}

/**
 * User Profile - complete profile data for a user
 *
 * Represents a user's complete profile including metadata, fingerprint,
 * environment information, and directory paths.
 */
export interface UserProfile {
  /** User metadata */
  meta: UserMeta;
  /** User fingerprint configuration */
  fingerprint: UserFingerprint;
  /** Environment information at time of profile creation */
  environment: UserEnvironment;
  /** Path to user's user-data directory (Playwright persistent context) */
  userDataDir: string;
  /** Whether the user has valid cookies */
  hasCookie: boolean;
}

// ============================================
// Profile Status
// ============================================

/**
 * Profile status indicating migration/state
 */
export type ProfileStatus = 'none' | 'legacy' | 'full';

/**
 * Profile existence information
 */
export interface ProfileStatusInfo {
  /** Overall profile status */
  status: ProfileStatus;
  /** Whether user-data directory exists */
  hasUserDataDir: boolean;
  /** Whether legacy cookies.json exists */
  hasLegacyCookies: boolean;
}

// ============================================
// Users Metadata (Version 2 - Profile Architecture)
// ============================================

/**
 * Profile reference in users.json
 */
export interface ProfileRef {
  /** Profile creation timestamp */
  createdAt: string;
  /** Last access timestamp */
  lastUsedAt: string;
  /** Environment type */
  environmentType: EnvironmentType;
}

/**
 * users.json content (version 2)
 *
 * Version 2 adds profile references for the new Profile architecture.
 */
export interface UsersMeta {
  /** Current user name */
  current: UserName;
  /** Data version for future migrations (now 2) */
  version: number;
  /** Profile references for each user */
  profiles?: Record<UserName, ProfileRef>;
}
