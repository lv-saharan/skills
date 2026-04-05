/**
 * Browser module entry
 *
 * @module core/browser
 * @description CDP browser management + stealth injection
 */

// Profile launcher (main API)
export {
  withProfile,
  launchProfileBrowser,
  hasCDPInstance,
  getCDPPort,
  closeCDPInstance,
  randomStealthDelay,
} from './profile-launcher';
export type {
  StealthBehaviorConfig,
  ProfileLaunchOptions,
  ProfileBrowserResult,
} from './profile-launcher';

// Stealth modules
export {
  generateStealthScript,
  generateStealthScriptWithLocation,
  STEALTH_INJECTION_SCRIPT,
} from './stealth';
export type { StealthModuleConfig, GeolocationConfig } from './stealth/types';
export { DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION } from './stealth/types';

// Browser types
export type { BrowserLaunchOptions, BrowserInstance, CleanupResult } from './types';

// CDP internals
export { connectCDPBrowser, checkCDPConnection } from './cdp/connector';
