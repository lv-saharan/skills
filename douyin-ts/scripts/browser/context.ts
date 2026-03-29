/**
 * Browser context operations
 *
 * @module browser/context
 * @description Create browser context with stealth injection
 */

import type { Browser, BrowserContext } from 'playwright';
import { generateStealthScript } from './stealth';
import { getMostMainstreamPreset } from '../user/fingerprint';
import { config } from '../config';
import { debugLog } from '../utils/helpers';
import type { UserFingerprint } from '../user/types';

/** Context creation options */
export interface CreateContextOptions {
  /** Proxy server URL */
  proxy?: string;
  /** Enable stealth injection (default: true) */
  stealth?: boolean;
  /** User-bound device fingerprint */
  fingerprint?: UserFingerprint;
}

/**
 * Create browser context with optional proxy and stealth injection
 *
 * @param browser - Browser instance
 * @param options - Context options
 * @returns Browser context
 *
 * @example
 * // With user-bound fingerprint
 * const fp = await getUserFingerprint('my-user');
 * const context = await createContext(browser, { fingerprint: fp });
 */
export async function createContext(
  browser: Browser,
  options: CreateContextOptions = {}
): Promise<BrowserContext> {
  const { fingerprint } = options;

  // Use fingerprint values if available, otherwise use most mainstream preset
  let effectiveFingerprint: UserFingerprint;

  if (fingerprint) {
    effectiveFingerprint = fingerprint;
  } else {
    // Use most mainstream preset as default
    const preset = getMostMainstreamPreset();
    effectiveFingerprint = {
      version: 1,
      createdAt: new Date().toISOString(),
      device: {
        platform: preset.device.platform,
        hardwareConcurrency: preset.device.hardwareConcurrency,
        deviceMemory: preset.device.deviceMemory,
      },
      browser: {
        userAgent: preset.browser.userAgent,
        vendor: preset.browser.vendor,
        languages: preset.browser.languages,
      },
      webgl: {
        vendor: preset.webgl.vendor,
        renderer: preset.webgl.renderer,
      },
      screen: {
        width: preset.screen.width,
        height: preset.screen.height,
        colorDepth: preset.screen.colorDepth ?? 24,
      },
      canvasNoiseSeed: Math.floor(Math.random() * 10000000),
      audioNoiseSeed: Math.floor(Math.random() * 10000000),
      description: preset.description,
    };
    debugLog('Using most mainstream preset as default fingerprint');
  }

  const contextOptions: Parameters<typeof browser.newContext>[0] = {
    viewport: {
      width: effectiveFingerprint.screen.width,
      height: effectiveFingerprint.screen.height,
    },
    userAgent: effectiveFingerprint.browser.userAgent,
    locale: effectiveFingerprint.browser.languages[0] ?? 'zh-CN',
    timezoneId: 'Asia/Shanghai',
  };

  // Add proxy if configured
  const proxyUrl = options.proxy ?? config.proxy;
  if (proxyUrl) {
    contextOptions.proxy = { server: proxyUrl };
    debugLog(`Using proxy: ${proxyUrl}`);
  }

  const context = await browser.newContext(contextOptions);

  // Add Sec-CH-UA headers (Chrome Client Hints)
  const platform = effectiveFingerprint.device.platform;
  const secChUaPlatform =
    platform === 'MacIntel'
      ? '"macOS"'
      : platform === 'Linux x86_64'
        ? '"Linux"'
        : '"Windows"';
  await context.setExtraHTTPHeaders({
    'sec-ch-ua': '"Google Chrome";v="135", "Chromium";v="135", "Not:A-Brand";v="8"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': secChUaPlatform,
    'accept-language': effectiveFingerprint.browser.languages
      .map((l, i) => l + (i === 0 ? '' : `;q=${1 - i * 0.1}`))
      .join(', '),
  });
  debugLog('Added Sec-CH-UA headers');

  // Inject stealth script (default: true)
  const useStealth = options.stealth !== false;
  if (useStealth) {
    const script = generateStealthScript(effectiveFingerprint);
    await context.addInitScript(script);
    debugLog('Stealth script added to context', {
      platform: effectiveFingerprint.device.platform,
      description: effectiveFingerprint.description,
      userBound: !!fingerprint,
    });
  }

  return context;
}