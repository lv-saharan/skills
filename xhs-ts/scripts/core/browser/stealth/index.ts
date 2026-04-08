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
 * const modules = stealthRegistry.getModuleNames();
 * `
 */

// Re-export types
export * from './types';

// Re-export constants
export { DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION } from './constants';

// Re-export registry
export { stealthRegistry, autoRegister, getModuleNames } from './registry';

// Re-export generator
export { generateStealthScript, getEnabledModuleNames } from './generator';

// Re-export utilities
export { combineScripts, getIframeFixScript, getSourceURLScript } from './utils';

// ============================================
// Auto-register all stealth modules
// ============================================
// Importing these modules automatically registers them with the registry

import { navigatorModule } from './modules/navigator';
import { screenModule } from './modules/screen';
import { webglModule } from './modules/webgl';
import { canvasModule } from './modules/canvas';
import { audioModule } from './modules/audio';
import { chromeModule } from './modules/chrome';
import { webrtcModule } from './modules/webrtc';
import { mediaModule } from './modules/media';
import { timezoneModule } from './modules/timezone';
import { fontModule } from './modules/font';
import { batteryModule } from './modules/battery';
import { geolocationModule } from './modules/geolocation';
import { performanceModule } from './modules/performance';

// Modules are auto-registered when imported
