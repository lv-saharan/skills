/**
 * Browser module
 *
 * @module browser
 * @description Create, manage, and cleanup browser instances
 */

// Instance management
export { createBrowserInstance, closeBrowserInstance, closeBrowser, withBrowser } from './instance';

// Launch and context
export { launchBrowser, checkBrowserInstalled } from './launch';
export { createContext } from './context';

// Types
export type { BrowserInstance, BrowserLaunchOptions } from './types';
