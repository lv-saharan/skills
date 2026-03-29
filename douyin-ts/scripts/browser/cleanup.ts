/**
 * Browser cleanup utilities
 *
 * @module browser/cleanup
 * @description Global browser instance tracking and forced cleanup for crash recovery
 */

import type { Browser } from 'playwright';

/**
 * Active browser instance reference.
 * CLI runs one command per process, so only one browser instance at a time.
 */
let activeBrowser: Browser | null = null;

/**
 * Register a browser instance for cleanup tracking
 */
export function setActiveBrowser(browser: Browser | null): void {
  activeBrowser = browser;
}

/**
 * Get the current active browser instance
 */
export function getActiveBrowser(): Browser | null {
  return activeBrowser;
}

/**
 * Force cleanup the active browser instance.
 * Used in signal handlers and exception handlers.
 */
export async function forceCleanup(): Promise<void> {
  if (!activeBrowser) {
    return;
  }

  const browser = activeBrowser;

  try {
    if (browser.isConnected()) {
      await browser.close();
    }
  } catch {
    // Ignore cleanup errors - process is exiting anyway
  }

  activeBrowser = null;
}
