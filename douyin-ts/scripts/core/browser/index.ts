/**
 * Browser module entry
 *
 * @module core/browser
 * @description CDP browser management + stealth injection (platform-agnostic)
 *
 * For profile-aware browser launch, use actions/shared/browser-launcher instead.
 */

// Types
export type { BrowserInstance, EnvironmentType } from './types';

// Pure port utilities
export { checkCDPReady, allocatePortForIdentifier } from './port-utils';

// Pure browser launcher
export {
  launchBrowser,
  spawnCDPBrowser,
  tryReconnectCDP,
  closeBrowser,
  injectStealthToContext,
  findBrowserExecutablePath,
  type CDPLaunchOptions,
  type StealthLaunchOptions,
  type SavedConnection,
} from './launcher';

// Stealth behavior
export { getStealthBehavior } from './stealth-behavior';
export type { StealthBehaviorConfig } from './stealth-behavior';

// Stealth modules
export { generateStealthScript } from './stealth';
export type { StealthModuleConfig, GeolocationConfig } from './stealth/types';
export { DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION } from './stealth/constants';

// CDP internals
export { connectCDPBrowser, checkCDPConnection } from './cdp';
