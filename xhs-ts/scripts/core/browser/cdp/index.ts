/**
 * CDP Browser Module
 *
 * @module browser/cdp
 * @description CDP-based browser instance management for xhs-ts
 */

// Types
export * from './types';

// Port allocation
export { allocatePort, releasePortForUser } from './port-allocator';

// Launcher
export {
  spawnCDPBrowserDetached,
  launchCDPBrowser,
  launchCDPBrowserWithUserData,
  type LaunchCDPResult,
  type SpawnCDPResult,
} from './launcher';

// Connector
export { connectCDPBrowser, checkCDPConnection } from './connector';

// Stealth
export {
  injectStealthToContext,
  injectStealthToPage,
  injectStealthToExistingContexts,
  createStealthContext,
  createStealthPage,
  type StealthInjectionOptions,
} from './stealth';
