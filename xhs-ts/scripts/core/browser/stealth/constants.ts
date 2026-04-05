/**
 * Stealth module constants
 *
 * @module browser/stealth/constants
 * @description Default configurations for stealth injection scripts
 */

import type { StealthModuleConfig, GeolocationConfig } from './types';

// ============================================
// Default Stealth Configuration
// ============================================

/**
 * Default stealth module configuration (all modules enabled)
 */
export const DEFAULT_STEALTH_CONFIG: StealthModuleConfig = {
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

// ============================================
// Default Geolocation
// ============================================

/**
 * Default geolocation (Shanghai, China)
 */
export const DEFAULT_GEOLOCATION: GeolocationConfig = {
  latitude: 31.2304,
  longitude: 121.4737,
  accuracy: 100,
  altitude: null,
  altitudeAccuracy: null,
  heading: null,
  speed: null,
};
