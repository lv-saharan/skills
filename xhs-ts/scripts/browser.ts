/**
 * Browser management for Playwright automation
 *
 * @module browser
 * @description Create, manage, and cleanup browser instances
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import type { BrowserLaunchOptions } from './types';
import { XhsError, XhsErrorCode } from './types';
import { config, debugLog } from './utils/helpers';

// ============================================
// Types
// ============================================

export interface BrowserInstance {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

// ============================================
// Browser Creation
// ============================================

/**
 * Launch browser with configured options
 */
export async function launchBrowser(options: BrowserLaunchOptions = {}): Promise<Browser> {
  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: options.headless ?? config.headless,
    args: [
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
    ],
  };

  // Use custom browser path if specified
  if (options.browserPath ?? config.browserPath) {
    launchOptions.executablePath = options.browserPath ?? config.browserPath;
    debugLog(`Using custom browser: ${launchOptions.executablePath}`);
  }

  debugLog('Launching browser with options:', {
    headless: launchOptions.headless,
    hasCustomPath: !!launchOptions.executablePath,
  });

  try {
    const browser = await chromium.launch(launchOptions);
    debugLog('Browser launched successfully');
    return browser;
  } catch (error) {
    throw new XhsError(
      `Failed to launch browser: ${error instanceof Error ? error.message : 'Unknown error'}`,
      XhsErrorCode.BROWSER_ERROR,
      error
    );
  }
}

/**
 * Create browser context with optional proxy
 */
export async function createContext(
  browser: Browser,
  options: { proxy?: string } = {}
): Promise<BrowserContext> {
  const contextOptions: Parameters<typeof browser.newContext>[0] = {
    viewport: { width: 1280, height: 800 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  };

  // Add proxy if configured
  const proxyUrl = options.proxy ?? config.proxy;
  if (proxyUrl) {
    contextOptions.proxy = { server: proxyUrl };
    debugLog(`Using proxy: ${proxyUrl}`);
  }

  return browser.newContext(contextOptions);
}

/**
 * Create a full browser instance with context and page
 */
export async function createBrowserInstance(
  options: BrowserLaunchOptions = {}
): Promise<BrowserInstance> {
  const browser = await launchBrowser(options);
  const context = await createContext(browser, {
    proxy: options.proxy,
  });
  const page = await context.newPage();

  return { browser, context, page };
}

// ============================================
// Browser Cleanup
// ============================================

/**
 * Close browser instance gracefully
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

// ============================================
// Utility Functions
// ============================================

/**
 * Run a function with a browser instance, ensuring cleanup
 */
export async function withBrowser<T>(
  fn: (instance: BrowserInstance) => Promise<T>,
  options: BrowserLaunchOptions = {}
): Promise<T> {
  let instance: BrowserInstance | null = null;

  try {
    instance = await createBrowserInstance(options);
    return await fn(instance);
  } finally {
    await closeBrowserInstance(instance);
  }
}

/**
 * Check if browser is installed
 */
export async function checkBrowserInstalled(): Promise<boolean> {
  try {
    const browser = await chromium.launch({ headless: true });
    await browser.close();
    return true;
  } catch {
    return false;
  }
}
