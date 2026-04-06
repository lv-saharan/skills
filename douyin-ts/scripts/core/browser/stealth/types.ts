/**
 * Stealth module types
 *
 * @module browser/stealth/types
 * @description Type definitions for stealth injection scripts
 */

import type { UserFingerprint } from '../../fingerprint/types';

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

// Re-export UserFingerprint for convenience
export type { UserFingerprint };
