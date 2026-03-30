/**
 * Stealth injection script generator
 *
 * @module browser/stealth
 * @description Modular anti-detection script generator
 */

import type { UserFingerprint } from '../../user/types';
import type { StealthModuleConfig, GeolocationConfig } from './types';
import { DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION } from './types';

// Import module generators
import { generateNavigatorScript } from './navigator';
import { generateScreenScript } from './screen';
import { generateWebGLScript } from './webgl';
import { generateCanvasScript } from './canvas';
import { generateAudioScript } from './audio';
import { generateChromeScript } from './chrome';
import { generateWebRTCScript } from './webrtc';
import { generateMediaScript } from './media';
import { generateTimezoneScript } from './timezone';
import { generateFontScript } from './font';
import { generateBatteryScript } from './battery';
import { generateGeolocationScript } from './geolocation';
import { generatePerformanceScript } from './performance';
import { getPolyfillScript, getIframeFixScript, getSourceURLScript, combineScripts } from './utils';

// Re-export types
export * from './types';

/**
 * Generate complete stealth injection script with user-bound fingerprint
 *
 * @param fp - User's device fingerprint configuration
 * @param config - Optional module configuration
 * @returns JavaScript code to inject into browser context
 */
export function generateStealthScript(
  fp: UserFingerprint,
  config: StealthModuleConfig = DEFAULT_STEALTH_CONFIG,
  geolocation?: GeolocationConfig
): string {
  const scripts: string[] = [];

  // Always include polyfill
  scripts.push(getPolyfillScript());

  // Navigator spoofing
  if (config.navigator !== false) {
    scripts.push(generateNavigatorScript(fp));
  }

  // Screen spoofing
  if (config.screen !== false) {
    scripts.push(generateScreenScript(fp));
  }

  // WebGL fingerprint
  if (config.webgl !== false) {
    scripts.push(generateWebGLScript(fp));
  }

  // Canvas fingerprint noise
  if (config.canvas !== false) {
    scripts.push(generateCanvasScript(fp));
  }

  // Audio fingerprint noise
  if (config.audio !== false) {
    scripts.push(generateAudioScript(fp));
  }

  // Chrome API mock
  if (config.chrome !== false) {
    scripts.push(generateChromeScript());
  }

  // WebRTC leak prevention
  if (config.webrtc !== false) {
    scripts.push(generateWebRTCScript());
  }

  // Media spoofing
  if (config.media !== false) {
    scripts.push(generateMediaScript());
  }

  // Timezone consistency
  if (config.timezone !== false) {
    scripts.push(generateTimezoneScript());
  }

  // Font fingerprint protection
  if (config.font !== false) {
    scripts.push(generateFontScript(fp));
  }

  // Battery API mock
  if (config.battery !== false) {
    scripts.push(generateBatteryScript());
  }

  // Geolocation mock (new feature)
  if (config.geolocation !== false) {
    scripts.push(generateGeolocationScript(geolocation || DEFAULT_GEOLOCATION));
  }

  // Performance API consistency (new feature)
  if (config.performance !== false) {
    scripts.push(generatePerformanceScript());
  }

  // Iframe fix
  scripts.push(getIframeFixScript());

  // SourceURL hiding
  scripts.push(getSourceURLScript());

  return combineScripts(...scripts);
}

/**
 * Generate stealth script with custom geolocation
 *
 * @param fp - User's device fingerprint
 * @param latitude - Latitude
 * @param longitude - Longitude
 * @param accuracy - Accuracy in meters (default: 100)
 * @returns JavaScript code to inject
 */
export function generateStealthScriptWithLocation(
  fp: UserFingerprint,
  latitude: number,
  longitude: number,
  accuracy: number = 100
): string {
  const geolocation: GeolocationConfig = {
    latitude,
    longitude,
    accuracy,
    altitude: null,
    altitudeAccuracy: null,
    heading: null,
    speed: null,
  };

  return generateStealthScript(fp, DEFAULT_STEALTH_CONFIG, geolocation);
}

// ============================================
// Legacy Static Script (Backward Compatibility)
// ============================================

/**
 * Static stealth injection script (legacy)
 *
 * @deprecated Use generateStealthScript() with user fingerprint instead
 */
export const STEALTH_INJECTION_SCRIPT = `
// Legacy script - use generateStealthScript() instead
if (typeof window.__name === 'undefined') {
  window.__name = (fn, _name) => fn;
}
Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
`;
