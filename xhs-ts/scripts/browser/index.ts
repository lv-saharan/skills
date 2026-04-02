/**
 * Browser module
 *
 * @module browser
 * @description CDP-based browser management for Xiaohongshu automation
 */

// Main API (primary entry point for commands)
export {
  withProfile,
  launchProfileBrowser,
  hasCDPInstance,
  getCDPPort,
  closeCDPInstance,
} from './profile-launcher';

// Behavior configuration
export { getStealthBehavior, randomStealthDelay } from './profile-launcher';
export type {
  StealthBehaviorConfig,
  ProfileLaunchOptions,
  ProfileBrowserResult,
} from './profile-launcher';

// CDP internals (for advanced usage)
export { connectCDPBrowser, checkCDPConnection } from './cdp/connector';

// Types
export type { BrowserInstance, BrowserLaunchOptions, CleanupResult } from './types';
