/**
 * Browser Module Types
 *
 * @module core/browser/types
 * @description Unified type definitions for browser module
 *
 * This file consolidates all types from:
 * - launcher.ts (SavedConnection)
 * - stealth-behavior.ts (StealthBehaviorConfig)
 * - stealth/types.ts (StealthModuleConfig, GeolocationConfig)
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { UserFingerprint } from '../fingerprint/types';

// ============================================
// Browser Instance
// ============================================

/**
 * Browser instance container
 * Holds browser, context, page and connection info together
 */
export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  /** Browser WebSocket port */
  port?: number;
  /** Browser process ID */
  pid?: number;
  /** WebSocket endpoint URL (BrowserServer mode) */
  wsEndpoint?: string;
  /** Whether this is a newly spawned instance */
  isNewInstance?: boolean;
}

// ============================================
// Launch Options
// ============================================

/**
 * Browser launch options (all parameters explicit)
 */
export interface BrowserLaunchOptions {
  /** Path to user data directory (e.g., users/default/user-data) */
  userDataDir: string;
  /** Browser server port */
  port: number;
  /** Run in headless mode */
  headless?: boolean;
  /** Proxy URL */
  proxy?: string;
  /** Custom browser executable path */
  browserPath?: string;
  /** Browser channel */
  browserChannel?: string;
  /** User-Agent string for HTTP header override (critical for headless mode) */
  userAgent?: string;
  /** Viewport width for headless mode (should match fingerprint screen.width) */
  viewportWidth?: number;
  /** Viewport height for headless mode (should match fingerprint screen.height) */
  viewportHeight?: number;
}

/**
 * Browser launch options with fingerprint and behavior
 */
export interface LaunchBrowserOptions extends BrowserLaunchOptions {
  /** User fingerprint for stealth injection */
  fingerprint: UserFingerprint;
  /** Stealth behavior configuration (optional, uses default if not provided) */
  behavior?: StealthBehaviorConfig;
  /** Geolocation configuration (optional, defaults to Shanghai) */
  geolocation?: GeolocationConfig;
}

// ============================================
// Connection
// ============================================

/**
 * Saved connection info for reconnection
 * Supports BrowserServer (wsEndpoint) mode
 */
export interface SavedConnection {
  /** Port number */
  port: number;
  /** Process ID */
  pid?: number;
  /** WebSocket endpoint URL (BrowserServer mode - recommended) */
  wsEndpoint?: string;
  /** Headless mode the browser was started with */
  headless: boolean;
}

/**
 * Connection info stored in profile.json
 * Note: This type is exported for API completeness but the actual implementation
 * uses the ConnectionInfo from user/types.ts for profile.json storage.
 * This type is kept for backward compatibility and potential future use.
 */
export interface ConnectionInfo {
  /** Browser port */
  port: number;
  /** Process ID */
  pid?: number;
  /** WebSocket endpoint URL */
  wsEndpoint?: string;
  /** Headless mode */
  headless?: boolean;
  /** Browser start timestamp (ISO 8601) */
  startedAt: string;
  /** Last activity timestamp (ISO 8601) */
  lastActivityAt: string;
}

// ============================================
// Environment
// ============================================

/**
 * Environment detection type
 * Used to determine appropriate stealth behavior
 */
export type EnvironmentType = 'gui-native' | 'gui-virtual' | 'headless-smart' | 'headless-custom';

// ============================================
// Stealth Behavior
// ============================================

/**
 * Stealth behavior configuration
 */
export interface StealthBehaviorConfig {
  /** Minimum delay between actions (ms) */
  minActionDelay: number;
  /** Maximum delay between actions (ms) */
  maxActionDelay: number;
  /** Minimum reading time (ms) */
  minReadTime: number;
  /** Maximum reading time (ms) */
  maxReadTime: number;
  /** Enable viewport randomization */
  viewportRandomization: boolean;
  /** Enable human-like mouse movement */
  humanMouseMovement: boolean;
  /** Stealth module configuration */
  stealthConfig: StealthModuleConfig;
  /** Geolocation configuration */
  geolocation?: GeolocationConfig;
}

// ============================================
// Stealth Modules
// ============================================

/**
 * Stealth module configuration
 */
export interface StealthModuleConfig {
  /** Enable navigator spoofing */
  navigator?: boolean;
  /** Enable screen spoofing */
  screen?: boolean;
  /** Enable WebGL fingerprint spoofing */
  webgl?: boolean;
  /** Enable Canvas fingerprint noise */
  canvas?: boolean;
  /** Enable Audio fingerprint noise */
  audio?: boolean;
  /** Enable Chrome API mock */
  chrome?: boolean;
  /** Enable WebRTC leak prevention */
  webrtc?: boolean;
  /** Enable Media spoofing */
  media?: boolean;
  /** Enable Timezone consistency */
  timezone?: boolean;
  /** Enable Font fingerprint protection */
  font?: boolean;
  /** Enable Battery API mock */
  battery?: boolean;
  /** Enable Geolocation mock */
  geolocation?: boolean;
  /** Enable Performance API spoofing */
  performance?: boolean;
}

/**
 * Geolocation configuration
 */
export interface GeolocationConfig {
  /** Latitude */
  latitude: number;
  /** Longitude */
  longitude: number;
  /** Accuracy in meters */
  accuracy: number;
  /** Altitude in meters (optional) */
  altitude?: number | null;
  /** Altitude accuracy in meters (optional) */
  altitudeAccuracy?: number | null;
  /** Heading in degrees (optional) */
  heading?: number | null;
  /** Speed in m/s (optional) */
  speed?: number | null;
}

// ============================================
// Re-exports
// ============================================

// Re-export UserFingerprint for convenience
export type { UserFingerprint } from '../fingerprint/types';
