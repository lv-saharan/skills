/**
 * Profile-based browser launcher
 *
 * @module browser/profile-launcher
 * @description Launch browser with persistent context using Profile architecture
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import { chromium } from 'playwright';
import type { EnvironmentType } from '../user/types';
import { loadUserProfile, getUserDataDir, hasProfile, createUserProfile } from '../user/storage';
import { generateStealthScript } from './stealth';
import { config } from '../config';
import { debugLog, delay } from '../utils/helpers';
import type { UserName } from '../user/types';
import type { StealthModuleConfig, GeolocationConfig } from './stealth/types';

// ============================================
// Stealth Behavior Configuration
// ============================================

/**
 * Stealth behavior configuration based on environment type
 *
 * Defines how the browser behaves to avoid detection:
 * - gui-native: Real user environment, more natural/faster behavior
 * - gui-virtual: Virtual display, moderate caution
 * - headless-smart: Headless with smart preset, cautious behavior
 * - headless-custom: Custom headless, most cautious behavior
 */
export interface StealthBehaviorConfig {
  /** Minimum delay between actions (ms) */
  minActionDelay: number;
  /** Maximum delay between actions (ms) */
  maxActionDelay: number;
  /** Minimum reading time before interaction (ms) */
  minReadTime: number;
  /** Maximum reading time before interaction (ms) */
  maxReadTime: number;
  /** Whether to enable viewport randomization */
  viewportRandomization: boolean;
  /** Whether to enable human-like mouse movements */
  humanMouseMovement: boolean;
  /** Stealth module configuration */
  stealthConfig: StealthModuleConfig;
  /** Geolocation configuration */
  geolocation?: GeolocationConfig;
}

/**
 * Default stealth behavior for gui-native (real display)
 */
const GUI_NATIVE_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 500,
  maxActionDelay: 1500,
  minReadTime: 1000,
  maxReadTime: 3000,
  viewportRandomization: false,
  humanMouseMovement: true,
  stealthConfig: {
    navigator: true,
    screen: true,
    webgl: true,
    canvas: true,
    audio: true,
    chrome: true,
    webrtc: true,
    media: true,
    timezone: true,
    font: true,
    battery: true,
    geolocation: true,
    performance: true,
  },
};

/**
 * Default stealth behavior for gui-virtual (virtual display)
 */
const GUI_VIRTUAL_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 800,
  maxActionDelay: 2000,
  minReadTime: 1500,
  maxReadTime: 4000,
  viewportRandomization: false,
  humanMouseMovement: true,
  stealthConfig: {
    navigator: true,
    screen: true,
    webgl: true,
    canvas: true,
    audio: true,
    chrome: true,
    webrtc: true,
    media: true,
    timezone: true,
    font: true,
    battery: true,
    geolocation: true,
    performance: true,
  },
};

/**
 * Default stealth behavior for headless-smart (smart headless)
 */
const HEADLESS_SMART_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 1500,
  maxActionDelay: 3500,
  minReadTime: 2000,
  maxReadTime: 5000,
  viewportRandomization: true,
  humanMouseMovement: false,
  stealthConfig: {
    navigator: true,
    screen: true,
    webgl: true,
    canvas: true,
    audio: true,
    chrome: true,
    webrtc: true,
    media: true,
    timezone: true,
    font: true,
    battery: true,
    geolocation: true,
    performance: true,
  },
};

/**
 * Default stealth behavior for headless-custom (custom headless)
 */
const HEADLESS_CUSTOM_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 2000,
  maxActionDelay: 5000,
  minReadTime: 3000,
  maxReadTime: 8000,
  viewportRandomization: true,
  humanMouseMovement: false,
  stealthConfig: {
    navigator: true,
    screen: true,
    webgl: true,
    canvas: true,
    audio: true,
    chrome: true,
    webrtc: true,
    media: true,
    timezone: true,
    font: true,
    battery: true,
    geolocation: true,
    performance: true,
  },
};

/**
 * Get stealth behavior configuration based on environment type
 *
 * @param environmentType - The environment type
 * @returns Stealth behavior configuration for the environment
 *
 * @example
 * const behavior = getStealthBehavior('headless-smart');
 * console.log(behavior.minActionDelay); // 1500
 */
export function getStealthBehavior(environmentType: EnvironmentType): StealthBehaviorConfig {
  switch (environmentType) {
    case 'gui-native':
      return GUI_NATIVE_BEHAVIOR;
    case 'gui-virtual':
      return GUI_VIRTUAL_BEHAVIOR;
    case 'headless-smart':
      return HEADLESS_SMART_BEHAVIOR;
    case 'headless-custom':
      return HEADLESS_CUSTOM_BEHAVIOR;
    default:
      debugLog(`Unknown environment type: ${environmentType}, using headless-smart behavior`);
      return HEADLESS_SMART_BEHAVIOR;
  }
}

// ============================================
// Profile Launcher Types
// ============================================

/**
 * Profile browser launch options
 */
export interface ProfileLaunchOptions {
  /** User name (will be resolved) */
  user?: UserName;
  /** Headless mode (default: config.headless) */
  headless?: boolean;
  /** Proxy URL (optional) */
  proxy?: string;
  /** Custom browser executable path */
  browserPath?: string;
  /** Browser channel (e.g., 'chrome', 'msedge') */
  browserChannel?: string;
  /** Timeout for waiting for profile to be ready (ms) */
  timeout?: number;
  /** Whether to create profile if it doesn't exist */
  autoCreate?: boolean;
}

/**
 * Profile browser result
 */
export interface ProfileBrowserResult {
  /** Browser instance */
  browser: Browser;
  /** Browser context (persistent) */
  context: BrowserContext;
  /** Default page */
  page: Page;
  /** User name */
  user: UserName;
  /** Environment type */
  environmentType: EnvironmentType;
  /** Behavior config used */
  behavior: StealthBehaviorConfig;
}

// ============================================
// Profile Browser Launcher
// ============================================

/**
 * Launch browser with persistent context using Profile architecture
 *
 * This function:
 * 1. Loads user profile (or creates if autoCreate is true)
 * 2. Uses chromium.launchPersistentContext for automatic state persistence
 * 3. Injects stealth script with user-bound fingerprint
 * 4. Sets Sec-CH-UA headers for Chrome Client Hints
 *
 * @param options - Launch options
 * @returns Profile browser result with browser, context, page, and metadata
 *
 * @example
 * // Simple usage
 * const result = await launchProfileBrowser({ user: 'my-user' });
 * await result.page.goto('https://example.com');
 * // State (cookies, localStorage, IndexedDB) is automatically persisted
 * await result.browser.close();
 *
 * @example
 * // With auto-create profile
 * const result = await launchProfileBrowser({
 *   user: 'new-user',
 *   autoCreate: true,
 *   headless: true
 * });
 */
export async function launchProfileBrowser(
  options: ProfileLaunchOptions = {}
): Promise<ProfileBrowserResult> {
  const {
    user: explicitUser,
    headless = config.headless,
    proxy,
    browserPath,
    browserChannel,
    timeout = 30000,
    autoCreate = false,
  } = options;

  // Resolve user name
  const { resolveUser } = await import('../user/storage');
  const user = explicitUser ?? resolveUser();

  debugLog(`Launching profile browser for user: ${user}`);

  // Check if profile exists
  if (!hasProfile(user)) {
    if (autoCreate) {
      debugLog(`Profile doesn't exist, creating for user: ${user}`);
      const { detectEnvironmentType } = await import('../user/environment');
      const envType = detectEnvironmentType();
      await createUserProfile(user, envType);
    } else {
      throw new Error(
        `Profile does not exist for user: ${user}. ` +
          'Use autoCreate: true to create profile automatically.'
      );
    }
  }

  // Load user profile
  const profile = await loadUserProfile(user);
  const userDataDir = getUserDataDir(user);
  const environmentType = profile.meta.environmentType as EnvironmentType;
  const behavior = getStealthBehavior(environmentType);

  debugLog(`Profile loaded for ${user}:`, {
    environmentType,
    userDataDir,
    hasFingerprint: !!profile.fingerprint,
  });

  // Build launch options for persistent context
  const launchOptions: Parameters<typeof chromium.launchPersistentContext>[1] = {
    headless,
    // Minimal args for anti-detection
    args: ['--start-maximized'],
    // Enable signal handlers for automatic cleanup
    handleSIGINT: true,
    handleSIGTERM: true,
    handleSIGHUP: true,
    // Viewport from fingerprint
    viewport: {
      width: profile.fingerprint.screen.width,
      height: profile.fingerprint.screen.height,
    },
    // User agent from fingerprint
    userAgent: profile.fingerprint.browser.userAgent,
    // Locale from fingerprint
    locale: profile.fingerprint.browser.languages[0] ?? 'zh-CN',
    // Timezone
    timezoneId: 'Asia/Shanghai',
  };

  // Add proxy if configured
  const proxyUrl = proxy ?? config.proxy;
  if (proxyUrl) {
    launchOptions.proxy = { server: proxyUrl };
    debugLog(`Using proxy: ${proxyUrl}`);
  }

  // Use custom browser path if specified
  if (browserPath ?? config.browserPath) {
    launchOptions.executablePath = browserPath ?? config.browserPath;
    debugLog(`Using custom browser: ${launchOptions.executablePath}`);
  } else if (browserChannel ?? config.browserChannel) {
    launchOptions.channel = browserChannel ?? config.browserChannel;
    debugLog(`Using browser channel: ${launchOptions.channel}`);
  }

  // Launch browser with persistent context
  // This automatically persists: cookies, localStorage, IndexedDB, sessionStorage
  let context: BrowserContext;
  try {
    context = await chromium.launchPersistentContext(userDataDir, launchOptions);
    debugLog('Browser launched with persistent context');
  } catch (error) {
    throw new Error(
      `Failed to launch browser with persistent context: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }

  // Add Sec-CH-UA headers (Chrome Client Hints)
  // Extract Chrome version from User-Agent to ensure consistency
  const chromeVersion = profile.fingerprint.browser.userAgent.match(/Chrome\/(\d+)/)?.[1] ?? '135';
  const platform = profile.fingerprint.device.platform;
  const secChUaPlatform =
    platform === 'MacIntel' ? '"macOS"' : platform === 'Linux x86_64' ? '"Linux"' : '"Windows"';

  await context.setExtraHTTPHeaders({
    'sec-ch-ua': `"Google Chrome";v="${chromeVersion}", "Chromium";v="${chromeVersion}", "Not:A-Brand";v="8"`,
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': secChUaPlatform,
    'accept-language': profile.fingerprint.browser.languages
      .map((l, i) => l + (i === 0 ? '' : `;q=${1 - i * 0.1}`))
      .join(', '),
  });
  debugLog('Added Sec-CH-UA headers');

  // Inject stealth script
  const stealthScript = generateStealthScript(
    profile.fingerprint,
    behavior.stealthConfig,
    behavior.geolocation
  );
  await context.addInitScript(stealthScript);
  debugLog('Stealth script injected', {
    environmentType,
    description: profile.fingerprint.description,
  });

  // Get default page
  const pages = context.pages();
  const page = pages[0] ?? (await context.newPage());

  // Update last used timestamp
  await import('../user/storage').then(({ updateLastUsed }) => updateLastUsed(user));

  // Get browser from context (should always exist for persistent context)
  const browserInstance = context.browser();
  if (!browserInstance) {
    throw new Error('Browser not available from persistent context');
  }

  return {
    browser: browserInstance,
    context,
    page,
    user,
    environmentType,
    behavior,
  };
}

/**
 * Convenience function to run operations within a profile browser context
 *
 * Automatically handles browser cleanup on exit.
 *
 * @param user - User name
 * @param callback - Callback function receiving page
 * @param options - Launch options
 * @returns Callback result
 *
 * @example
 * const result = await withProfile('my-user', async (page) => {
 *   await page.goto('https://example.com');
 *   return await page.title();
 * });
 * console.log(result); // Page title
 */
export async function withProfile<T>(
  user: UserName,
  callback: (page: Page, result: Omit<ProfileBrowserResult, 'page'>) => Promise<T>,
  options: Omit<ProfileLaunchOptions, 'user'> = {}
): Promise<T> {
  const result = await launchProfileBrowser({ ...options, user });

  try {
    return await callback(result.page, {
      browser: result.browser,
      context: result.context,
      user: result.user,
      environmentType: result.environmentType,
      behavior: result.behavior,
    });
  } finally {
    // Ensure browser is closed
    await result.browser.close();
    debugLog(`Profile browser closed for user: ${result.user}`);
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Wait for a random delay based on behavior configuration
 *
 * @param behavior - Stealth behavior configuration
 * @param actionType - Type of action ('action' or 'read')
 * @returns Promise that resolves after random delay
 */
export async function randomStealthDelay(
  behavior: StealthBehaviorConfig,
  actionType: 'action' | 'read' = 'action'
): Promise<void> {
  const { min, max } =
    actionType === 'read'
      ? { min: behavior.minReadTime, max: behavior.maxReadTime }
      : { min: behavior.minActionDelay, max: behavior.maxActionDelay };

  const delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
  await delay(delayMs);
}

// ============================================
// Exports
// ============================================

export type { EnvironmentType } from '../user/types';
export type { StealthBehaviorConfig as StealthBehaviorConfigType } from './profile-launcher';
