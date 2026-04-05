/**
 * User module types
 *
 * @module user/types
 * @description Type definitions for multi-user management and Profile architecture
 */

import type {
  DevicePlatform,
  ScreenConfig,
  DeviceConfig,
  WebGLConfig,
  BrowserConfig,
  UserFingerprint,
} from '../core/fingerprint/types';
import type { GeolocationConfig } from '../core/browser/stealth/types';

// Re-export types for backward compatibility
export type {
  DevicePlatform,
  ScreenConfig,
  DeviceConfig,
  WebGLConfig,
  BrowserConfig,
  UserFingerprint,
  GeolocationConfig,
};

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
// User Information
// ============================================

/** User info derived from directory */
export interface UserInfo {
  /** User name (directory name) */
  name: UserName;
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
// Connection Info (CDP) - NEW
// ============================================

/**
 * Browser connection information for CDP mode
 *
 * Stored within UserProfileData.connection field.
 * Only present when CDP browser instance is running.
 */
export interface ConnectionInfo {
  /** CDP debugging port */
  cdpPort: number;
  /** Browser process ID (0 on Windows due to 'start' command limitation) */
  pid?: number;
  /** WebSocket endpoint URL for CDP connection */
  wsEndpoint?: string;
  /** Headless mode the browser was started with */
  headless?: boolean;
  /** Browser start timestamp (ISO 8601) */
  startedAt: string;
  /** Last activity timestamp (ISO 8601) */
  lastActivityAt: string;
}

// ============================================
// Profile Meta (New Unified Structure) - NEW
// ============================================

/**
 * Profile metadata - unified structure
 *
 * Stores user profile information including creation time,
 * environment type, and fingerprint source.
 */
export interface ProfileMeta {
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
 * User Profile Data - unified storage structure (v3) - NEW
 *
 * Single file storage for all user profile data.
 * Stored at: users/{user}/profile.json
 *
 * Replaces the previous two-file structure:
 * - users/{user}/meta.json (Profile metadata)
 * - users/{user}/connections/meta.json (CDP connection info)
 */
export interface UserProfileData {
  /** Schema version */
  version: 1;
  /** Profile metadata */
  meta: ProfileMeta;
  /** CDP connection info (optional, only when CDP browser is running) */
  connection?: ConnectionInfo;
  /** User geolocation config (optional, defaults to Shanghai) */
  geolocation?: GeolocationConfig;
}

// ============================================
// User Meta (Legacy - kept for backward compatibility)
// ============================================

/**
 * User metadata stored in meta.json within each user's profile directory
 *
 * @deprecated Use ProfileMeta instead. This type is kept for migration purposes.
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
  meta: ProfileMeta;
  /** User fingerprint configuration */
  fingerprint: UserFingerprint;
  /** Environment information at time of profile creation */
  environment: UserEnvironment;
  /** Path to user's user-data directory (Playwright persistent context) */
  userDataDir: string;
  /** User geolocation config (optional) */
  geolocation?: GeolocationConfig;
}

// ============================================
// Profile Status
// ============================================

/**
 * Profile status
 */
export type ProfileStatus = 'none' | 'full';

/**
 * Profile existence information
 */
export interface ProfileStatusInfo {
  /** Overall profile status */
  status: ProfileStatus;
  /** Whether user-data directory exists */
  hasUserDataDir: boolean;
  /** Whether meta.json exists */
  hasMeta: boolean;
}

// ============================================
// Users Metadata (Version 3 - Simplified)
// ============================================

/**
 * Profile reference in users.json
 *
 * @deprecated In v3, profiles are no longer stored in users.json.
 * All profile data is in users/{user}/profile.json
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
 * users.json content (version 3 - simplified)
 *
 * Version 3 removes the profiles field - all profile data
 * is now stored in users/{user}/profile.json.
 */
export interface UsersMeta {
  /** Current user name */
  current: UserName;
  /** Data version for future migrations (now 3) */
  version: number;
  /** Profile references for each user (deprecated, kept for migration) */
  profiles?: Record<UserName, ProfileRef>;
}
