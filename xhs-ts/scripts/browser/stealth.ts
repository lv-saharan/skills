/**
 * Stealth injection script
 *
 * @module browser/stealth
 * @description Anti-detection script to hide automation fingerprints
 *
 * This file re-exports from the modular stealth/ directory.
 * All functionality is now in scripts/browser/stealth/ modules.
 */

// Re-export everything from the modular stealth system
export {
  generateStealthScript,
  generateStealthScriptWithLocation,
  DEFAULT_STEALTH_CONFIG,
  DEFAULT_GEOLOCATION,
} from './stealth/index';

// Re-export types
export type {
  StealthModuleConfig,
  GeolocationConfig,
  StealthScriptGenerator,
} from './stealth/types';
