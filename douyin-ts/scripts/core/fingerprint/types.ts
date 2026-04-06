/**
 * Fingerprint types
 *
 * @module core/fingerprint/types
 * @description Type definitions for device fingerprints (platform-agnostic)
 */

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
  /** Device pixel ratio (optional for backward compatibility, defaults to 1) */
  devicePixelRatio?: 1 | 1.25 | 1.5 | 2;
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
// Device Preset Types
// ============================================

/**
 * Device preset configuration
 *
 * Used to generate fingerprints from predefined configurations.
 */
export interface DevicePreset {
  /** Weight for random selection (higher = more likely) */
  weight: number;
  /** Description of the preset */
  description: string;
  /** Device configuration */
  device: DeviceConfig;
  /** WebGL configuration */
  webgl: WebGLConfig;
  /** Browser configuration */
  browser: BrowserConfig;
  /** Screen configuration */
  screen: ScreenConfig;
}

/**
 * Fingerprint configuration
 */
export interface FingerprintConfig {
  /** Presets to choose from */
  presets: DevicePreset[];
  /** Path to config file */
  configPath?: string;
}
