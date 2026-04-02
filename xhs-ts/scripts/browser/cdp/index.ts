/**
 * CDP Browser Module
 *
 * @module browser/cdp
 * @description CDP-based browser instance management for xhs-ts
 */

// Types
export * from './types';

// Port allocation
export {
  allocatePort,
  releasePort,
  releasePortForUser,
  checkPortAvailable,
  checkCDPReady,
  getPortForUser,
} from './port-allocator';

// Launcher
export {
  spawnCDPBrowserDetached,
  launchCDPBrowser,
  launchCDPBrowserWithUserData,
  type LaunchCDPResult,
  type SpawnCDPResult,
} from './launcher';

// Connector
export {
  connectCDPBrowser,
  connectCDPBrowserViaWS,
  checkCDPConnection,
  getCDPEndpointInfo,
  buildCDPConnectionMeta,
} from './connector';

// Stealth
export {
  injectStealthToContext,
  injectStealthToPage,
  injectStealthToExistingContexts,
  createStealthContext,
  createStealthPage,
  type StealthInjectionOptions,
} from './stealth';
