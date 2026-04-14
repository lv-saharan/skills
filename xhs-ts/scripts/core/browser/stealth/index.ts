/**
 * Stealth injection script generator
 *
 * @module browser/stealth
 * @description Modular anti-detection script generator with registry-based architecture
 *
 * @example
 * `	ypescript
 * import { generateStealthScript, stealthRegistry } from './stealth';
 *
 * // Generate script with default config (all modules enabled)
 * const script = generateStealthScript(fingerprint);
 *
 * // Generate script with custom config (disable canvas)
 * const script = generateStealthScript(fingerprint, { canvas: false });
 *
 * // List registered modules
 * const modules = stealthRegistry.getAll().map(m => m.name);
 * `
 */

// Re-export types
export * from './types';

// Re-export constants
export { DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION } from './constants';

// Re-export registry
export { stealthRegistry, autoRegister } from './registry';

// Re-export generator
export { generateStealthScript } from './generator';

// Re-export utilities
export { combineScripts } from './utils';

// ============================================
// Auto-register all stealth modules
// ============================================
// Importing these modules automatically registers them with the registry

import './modules/navigator';
import './modules/screen';
import './modules/webgl';
import './modules/canvas';
import './modules/audio';
import './modules/chrome';
import './modules/webrtc';
import './modules/media';
import './modules/timezone';
import './modules/font';
import './modules/battery';
import './modules/geolocation';
import './modules/performance';

// Modules are auto-registered when imported
