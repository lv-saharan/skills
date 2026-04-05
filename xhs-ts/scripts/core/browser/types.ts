/**
 * Browser module types
 *
 * @module browser/types
 * @description Type definitions for CDP-based browser management
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
  /** Browser channel (e.g., 'chrome', 'msedge') */
  browserChannel?: string;
  /** Enable stealth injection (default: true) */
  stealth?: boolean;
}

// ============================================
// Browser Instance (Simplified for CDP)
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

// ============================================
// Cleanup Result
// ============================================

/** Result of cleanup operation */
export interface CleanupResult {
  /** Number of pages closed */
  pagesClosed: number;
  /** Whether context was closed */
  contextClosed: boolean;
  /** Whether browser was closed */
  browserClosed: boolean;
  /** Any errors during cleanup */
  errors: Array<{ resource: string; error: Error }>;
  /** Total cleanup duration in milliseconds */
  duration: number;
}
