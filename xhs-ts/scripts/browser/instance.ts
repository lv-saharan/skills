/**
 * Browser instance management
 *
 * @module browser/instance
 * @description Create and manage browser instances with rollback support
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { BrowserInstance, BrowserLaunchOptions, CleanupResult } from './types';
import { launchBrowser } from './launch';
import { createContext } from './context';
import { debugLog } from '../utils/helpers';

async function safeClose(resource: { close(): Promise<void> } | null, name: string): Promise<void> {
  if (!resource) {
    return;
  }
  try {
    await resource.close();
    debugLog(`${name} closed`);
  } catch (error) {
    debugLog(`Error closing ${name}:`, error);
  }
}

export async function createBrowserInstance(
  options: BrowserLaunchOptions & { stealth?: boolean } = {}
): Promise<BrowserInstance> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    browser = await launchBrowser(options);

    try {
      context = await createContext(browser, {
        proxy: options.proxy,
        stealth: options.stealth,
      });
    } catch (error) {
      await safeClose(browser, 'browser');
      throw error;
    }

    try {
      page = await context.newPage();
    } catch (error) {
      await safeClose(context, 'context');
      await safeClose(browser, 'browser');
      throw error;
    }

    return { browser, context, page };
  } catch (error) {
    debugLog('createBrowserInstance failed, resources cleaned up');
    throw error;
  }
}

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

export async function closeBrowserInstance(
  instance: BrowserInstance | null
): Promise<CleanupResult> {
  const result: CleanupResult = {
    pagesClosed: 0,
    contextClosed: false,
    browserClosed: false,
    errors: [],
    duration: 0,
  };

  if (!instance) {
    return result;
  }

  const { browser, context, page } = instance;
  const startTime = Date.now();

  if (page && !page.isClosed()) {
    try {
      await page.close();
      result.pagesClosed = 1;
    } catch (e) {
      result.errors.push({
        resource: 'page',
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  if (context) {
    try {
      await context.close();
      result.contextClosed = true;
    } catch (e) {
      result.errors.push({
        resource: 'context',
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  if (browser && browser.isConnected()) {
    try {
      await browser.close();
      result.browserClosed = true;
    } catch (e) {
      result.errors.push({
        resource: 'browser',
        error: e instanceof Error ? e : new Error(String(e)),
      });
    }
  }

  result.duration = Date.now() - startTime;
  return result;
}

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
