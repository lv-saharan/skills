/**
 * Browser context operations
 *
 * @module browser/context
 * @description Create browser context with stealth injection
 */

import type { Browser, BrowserContext } from 'playwright';
import { STEALTH_INJECTION_SCRIPT } from './stealth';
import { config } from '../config';
import { debugLog } from '../utils/helpers';

/**
 * Create browser context with optional proxy and stealth injection
 */
export async function createContext(
  browser: Browser,
  options: { proxy?: string; stealth?: boolean } = {}
): Promise<BrowserContext> {
  const contextOptions: Parameters<typeof browser.newContext>[0] = {
    viewport: { width: 1400, height: 900 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    locale: 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  };

  // Add proxy if configured
  const proxyUrl = options.proxy ?? config.proxy;
  if (proxyUrl) {
    contextOptions.proxy = { server: proxyUrl };
    debugLog(`Using proxy: ${proxyUrl}`);
  }

  const context = await browser.newContext(contextOptions);

  // Inject stealth script (default: true)
  const useStealth = options.stealth !== false;
  if (useStealth) {
    await context.addInitScript(STEALTH_INJECTION_SCRIPT);
    debugLog('Stealth injection script added to context');
  }

  return context;
}
