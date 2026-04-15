/**
 * Browser module entry
 *
 * @module core/browser
 * @description Browser management + stealth injection (platform-agnostic)
 *
 * For profile-aware browser launch, use actions/shared/browser-launcher instead.
 */

// ============================================
// Types (Unified)
// ============================================

export type {
  BrowserInstance,
  EnvironmentType,
  BrowserLaunchOptions,
  LaunchBrowserOptions,
  SavedConnection,
  ConnectionInfo,
  StealthBehaviorConfig,
  StealthModuleConfig,
  GeolocationConfig,
} from './types';

// ============================================
// Port Utilities
// ============================================

export { allocatePortForIdentifier } from './port-utils';

// ============================================
// Browser Launcher
// ============================================

export {
  launchBrowser,
  launchBrowserServer,
  tryReconnectServer,
  closeBrowser,
  findBrowserExecutablePath,
} from './launcher';

// ============================================
// Connection (BrowserServer)
// ============================================

export { connectToServer, checkServerConnection, checkBrowserEndpointHealth } from './connection';

// ============================================
// Stealth Behavior
// ============================================

export { getStealthBehavior } from './stealth-behavior';

// ============================================
// Stealth Modules
// ============================================

export { generateStealthScript } from './stealth';
export { DEFAULT_STEALTH_CONFIG, DEFAULT_GEOLOCATION } from './stealth/constants';

// ============================================
// Authentication
// ============================================

export { checkLoginStatus } from './auth';

export type { LoginSelectors } from './auth';
