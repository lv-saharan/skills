/**
 * Stealth module types
 *
 * @module browser/stealth/types
 * @description Type definitions for stealth injection scripts
 */

import type { UserFingerprint } from '../../user/types';

/**
 * Stealth script generator function type
 */
export type StealthScriptGenerator = (fp: UserFingerprint) => string;

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
 * Default stealth module configuration (all enabled)
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

// Re-export UserFingerprint for convenience
export type { UserFingerprint };
