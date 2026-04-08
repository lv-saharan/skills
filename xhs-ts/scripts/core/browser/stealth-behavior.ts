/**
 * Stealth Behavior Configuration
 *
 * @module browser/stealth-behavior
 * @description Environment-specific stealth behavior presets for anti-detection
 */

import type { EnvironmentType, StealthBehaviorConfig, StealthModuleConfig } from './types';

// ============================================
// Stealth Module Configurations
// ============================================

/**
 * Full stealth config (all modules enabled)
 * Used for behavior presets (gui-native, gui-virtual, headless-smart)
 * Note: Same content as DEFAULT_STEALTH_CONFIG (stealth/constants.ts) but kept local
 * for clarity as this is part of behavior preset definitions, not script generation.
 */
const FULL_STEALTH_CONFIG: StealthModuleConfig = {
  navigator: true,
  screen: true,
  webgl: true,
  canvas: true,
  audio: true,
  chrome: true,
  webrtc: true,
  media: true,
  timezone: true,
  font: true,
  battery: true,
  geolocation: true,
  performance: true,
};

/**
 * Minimal stealth config (essential modules only)
 * Used for headless-custom behavior preset (faster, reduced protection)
 * Disables: canvas, audio, media, font, battery fingerprints
 */
const MINIMAL_STEALTH_CONFIG: StealthModuleConfig = {
  navigator: true,
  screen: true,
  webgl: true,
  canvas: false,
  audio: false,
  chrome: true,
  webrtc: true,
  media: false,
  timezone: true,
  font: false,
  battery: false,
  geolocation: true,
  performance: true,
};

// ============================================
// Environment Presets
// ============================================

/**
 * GUI Native environment behavior
 * - Real display, normal delays
 * - Human-like mouse movement
 * - Full stealth protection
 */
const GUI_NATIVE_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 500,
  maxActionDelay: 1500,
  minReadTime: 1000,
  maxReadTime: 3000,
  viewportRandomization: false,
  humanMouseMovement: true,
  stealthConfig: FULL_STEALTH_CONFIG,
};

/**
 * GUI Virtual environment behavior
 * - Virtual display (Xvfb, WSLg)
 * - Slightly longer delays
 * - Full stealth protection
 */
const GUI_VIRTUAL_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 800,
  maxActionDelay: 2000,
  minReadTime: 1500,
  maxReadTime: 4000,
  viewportRandomization: false,
  humanMouseMovement: true,
  stealthConfig: FULL_STEALTH_CONFIG,
};

/**
 * Headless Smart environment behavior
 * - Server environment, longer delays
 * - No human-like mouse movement
 * - Full stealth protection with viewport randomization
 */
const HEADLESS_SMART_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 1500,
  maxActionDelay: 3500,
  minReadTime: 2000,
  maxReadTime: 5000,
  viewportRandomization: true,
  humanMouseMovement: false,
  stealthConfig: FULL_STEALTH_CONFIG,
};

/**
 * Headless Custom environment behavior
 * - Custom configuration for specific scenarios
 * - Moderate delays
 * - Minimal stealth (faster)
 */
const HEADLESS_CUSTOM_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 1000,
  maxActionDelay: 2500,
  minReadTime: 1500,
  maxReadTime: 4000,
  viewportRandomization: true,
  humanMouseMovement: false,
  stealthConfig: MINIMAL_STEALTH_CONFIG,
};

// ============================================
// Preset Registry
// ============================================

/**
 * Behavior presets for each environment type
 */
const BEHAVIOR_PRESETS: Record<EnvironmentType, StealthBehaviorConfig> = {
  'gui-native': GUI_NATIVE_BEHAVIOR,
  'gui-virtual': GUI_VIRTUAL_BEHAVIOR,
  'headless-smart': HEADLESS_SMART_BEHAVIOR,
  'headless-custom': HEADLESS_CUSTOM_BEHAVIOR,
};

// ============================================
// Public API
// ============================================

/**
 * Get stealth behavior configuration for an environment type
 *
 * @param environmentType - Environment type
 * @returns Stealth behavior configuration
 */
export function getStealthBehavior(environmentType: EnvironmentType): StealthBehaviorConfig {
  return BEHAVIOR_PRESETS[environmentType] || HEADLESS_SMART_BEHAVIOR;
}

// Re-export type
export type { StealthBehaviorConfig } from './types';
