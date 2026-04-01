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
  getAllocatedPorts,
  getPortForUser,
  clearAllPorts,
} from './port-allocator';

// Launcher
export { launchCDPBrowser, launchCDPBrowserWithUserData, type LaunchCDPResult } from './launcher';

// Connector
export {
  connectCDPBrowser,
  connectCDPBrowserViaWS,
  checkCDPConnection,
  getCDPEndpointInfo,
  tryConnectCDPBrowser,
  buildCDPConnectionMeta,
} from './connector';

// Stealth
export {
  injectStealthToContext,
  injectStealthToPage,
  setupBrowserStealth,
  injectStealthToExistingContexts,
  createStealthContext,
  createStealthPage,
  type StealthInjectionOptions,
} from './stealth';

// Instance Manager
export { browserInstanceManager } from './instance-manager';

// Health Monitor
export { healthMonitor, setupLifecycleHooks } from './health-monitor';

// Command Lifecycle
export {
  withMainPage,
  withCommandPage,
  withCommandContext,
  initializeCDPBrowserSystem,
  shutdownCDPBrowserSystem,
} from './command-lifecycle';
