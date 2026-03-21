/**
 * Browser launch operations
 *
 * @module browser/launch
 * @description Launch browser with configured options
 */

import type { Browser } from 'playwright';
import { chromium } from 'playwright';
import type { BrowserLaunchOptions } from './types';
import { XhsError, XhsErrorCode } from '../shared';
import { config } from '../config';
import { debugLog } from '../utils/helpers';

/**
 * Launch browser with configured options
 *
 * Key anti-detection technique: Use MINIMAL args
 * Only --start-maximized, no automation-related flags
 */
export async function launchBrowser(options: BrowserLaunchOptions = {}): Promise<Browser> {
  const launchOptions: Parameters<typeof chromium.launch>[0] = {
    headless: options.headless ?? config.headless,
    args: ['--start-maximized'],
  };

  // Use custom browser path if specified
  if (options.browserPath ?? config.browserPath) {
    launchOptions.executablePath = options.browserPath ?? config.browserPath;
    debugLog(`Using custom browser: ${launchOptions.executablePath}`);
  } else if (config.browserChannel) {
    launchOptions.channel = config.browserChannel;
    debugLog(`Using browser channel: ${launchOptions.channel}`);
  }

  debugLog('Launching browser with options:', {
    headless: launchOptions.headless,
    hasCustomPath: !!launchOptions.executablePath,
    channel: launchOptions.channel,
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
