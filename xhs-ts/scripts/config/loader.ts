/**
 * Configuration loader
 *
 * @module config/loader
 * @description Type-safe JSON configuration loader for platform-agnostic settings
 *
 * RESPONSIBILITY: This module only exports configuration that ALL base modules can use.
 * Business-specific configurations (like login selectors) belong in their respective action modules.
 */

import platformJson from './json/platform.json';
import type { PlatformConfig } from './types';

// ============================================
// Typed Configuration Exports
// ============================================

/** Platform configuration (URLs, timeouts, delays) */
export const platform = platformJson as PlatformConfig;

// ============================================
// Convenience Re-exports
// ============================================

/** Platform URLs */
export const urls = platform.urls;

/** Platform domain */
export const domain = platform.domain;

/** Timeout values */
export const timeouts = platform.timeouts;

/** Delay presets */
export const delays = platform.delays;

/** Stealth behavior delays */
export const stealthDelays = platform.stealthDelays;

// ============================================
// Utility Functions
// ============================================

/**
 * Check if URL belongs to this platform
 */
export function isPlatformUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(platform.domain);
  } catch {
    return false;
  }
}
