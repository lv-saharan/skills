/**
 * Browser instance management
 *
 * @module browser/instance
 * @description Create and manage browser instances
 */

import type { Browser } from 'playwright';
import type { BrowserInstance, BrowserLaunchOptions } from './types';
import { launchBrowser } from './launch';
import { createContext } from './context';
import { debugLog } from '../utils/helpers';

/**
 * Create a full browser instance with context and page
 */
export async function createBrowserInstance(
  options: BrowserLaunchOptions & { stealth?: boolean } = {}
): Promise<BrowserInstance> {
  const browser = await launchBrowser(options);
  const context = await createContext(browser, {
    proxy: options.proxy,
    stealth: options.stealth,
  });
  const page = await context.newPage();

  return { browser, context, page };
}

/**
 * Close browser gracefully
 */
export async function closeBrowser(browser: Browser | null): Promise<void> {
  if (browser) {
    try {
      await browser.close();
      debugLog('Browser closed');
    } catch (error) {
      debugLog('Error closing browser:', error);
    }
  }
}

/**
 * Close browser instance components
 */
export async function closeBrowserInstance(instance: BrowserInstance | null): Promise<void> {
  if (instance) {
    await closeBrowser(instance.browser);
  }
}

/**
 * Run a function with a browser instance, ensuring cleanup
 */
export async function withBrowser<T>(
  fn: (instance: BrowserInstance) => Promise<T>,
  options: BrowserLaunchOptions & { stealth?: boolean } = {}
): Promise<T> {
  let instance: BrowserInstance | null = null;

  try {
    instance = await createBrowserInstance(options);
    return await fn(instance);
  } finally {
    await closeBrowserInstance(instance);
  }
}
