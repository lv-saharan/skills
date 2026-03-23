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

// Types
export type {
  BrowserInstance,
  BrowserLaunchOptions,
  BrowserSession as BrowserSessionType,
  TrackedPage,
  CleanupResult,
  AsyncDisposableResource,
} from './types';
