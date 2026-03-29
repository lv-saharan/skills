/**
 * Browser module
 *
 * @module browser
 * @description Create, manage, and cleanup browser instances
 */

// Session management (new API - recommended)
export { BrowserSessionImpl as BrowserSession, withSession } from './session';

// Instance management (legacy API - backward compatible)
export { createBrowserInstance, closeBrowserInstance, closeBrowser, withBrowser } from './instance';

// Launch and context
export { launchBrowser, checkBrowserInstalled } from './launch';
export { createContext } from './context';

// Fingerprint presets
export {
  MAINSTREAM_PRESETS,
  selectPresetByWeight,
  getPresetList,
  getScreenResolutionStats,
  validatePreset,
} from './fingerprint-presets';

// Cleanup utilities
export { setActiveBrowser, getActiveBrowser, forceCleanup } from './cleanup';

// Types
export type {
  BrowserInstance,
  BrowserLaunchOptions,
  BrowserSession as BrowserSessionType,
  TrackedPage,
  CleanupResult,
  AsyncDisposableResource,
} from './types';

export type { CreateContextOptions } from './context';
export type {
  DevicePreset,
  DevicePlatform as DevicePlatformType,
  DeviceConfig as DeviceConfigType,
  WebGLConfig as WebGLConfigType,
  BrowserConfig as BrowserConfigType,
  ScreenConfig as ScreenConfigType,
} from './fingerprint-presets';