/**
 * Browser module types
 *
 * @module browser/types
 * @description Type definitions for browser management
 */

import type { Browser, BrowserContext, Page } from 'playwright';

// ============================================
// Launch Options
// ============================================

/** Browser launch options */
export interface BrowserLaunchOptions {
  /** Headless mode */
  headless?: boolean;
  /** Proxy URL */
  proxy?: string;
  /** Custom browser executable path */
  browserPath?: string;
}

// ============================================
// Browser Instance
// ============================================

/**
 * Browser instance container
 * Holds browser, context, and page together
 */
export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}
