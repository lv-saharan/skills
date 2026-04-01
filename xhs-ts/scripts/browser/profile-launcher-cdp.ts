/**
 * Profile-based CDP browser launcher
 *
 * @module browser/profile-launcher-cdp
 * @description Launch/connect browser via CDP with automatic instance management
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { UserName } from '../user/types';
import type { StealthBehaviorConfig } from './profile-launcher';
import { createStealthPage, injectStealthToExistingContexts } from './cdp/stealth';
import { connectCDPBrowser, checkCDPConnection } from './cdp/connector';
import { spawnCDPBrowserDetached } from './cdp/launcher';
import {
  loadBrowserConnection,
  saveBrowserConnection,
  clearBrowserConnection,
  getUserDataDir,
  resolveUser,
  loadUserProfile,
  hasProfile,
  createUserProfile,
} from '../user/storage';
import { getStealthBehavior } from './profile-launcher';
import type { EnvironmentType } from '../user/types';
import { config } from '../config';
import { debugLog } from '../utils/helpers';
import { allocatePort, releasePortForUser } from './cdp/port-allocator';

// ============================================
// Types
// ============================================

/**
 * CDP Profile launch options
 */
export interface ProfileCDPLaunchOptions {
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
  /** Whether to keep browser running after CLI exits (default: true for CDP) */
  keepAlive?: boolean;
  /** Timeout for connection (ms) */
  timeout?: number;
  /** Whether to auto-create profile if not exists (default: false) */
  autoCreate?: boolean;
}

/**
 * CDP Profile browser result
 */
export interface ProfileCDPBrowserResult {
  /** Browser instance */
  browser: Browser;
  /** Browser context */
  context: BrowserContext;
  /** Default page */
  page: Page;
  /** User name */
  user: UserName;
  /** Environment type */
  environmentType: EnvironmentType;
  /** Behavior config used */
  behavior: StealthBehaviorConfig;
  /** CDP port */
  cdpPort: number;
  /** Whether this is a new instance or reconnected */
  isNewInstance: boolean;
}

// ============================================
// CDP Connection Management
// ============================================

/**
 * Try to connect to an existing CDP browser for a user
 *
 * @param user - User name
 * @returns Browser if connected, null otherwise
 */
async function tryConnectExistingCDP(user: UserName): Promise<Browser | null> {
  const savedConnection = await loadBrowserConnection(user);

  if (!savedConnection?.cdpPort) {
    debugLog(`No saved CDP connection for user: ${user}`);
    return null;
  }

  // Check if CDP endpoint is responsive
  const isResponsive = await checkCDPConnection(savedConnection.cdpPort);
  if (!isResponsive) {
    debugLog(`CDP endpoint not responsive for user: ${user}, port: ${savedConnection.cdpPort}`);
    await clearBrowserConnection(user);
    await releasePortForUser(user);
    return null;
  }

  // Try to connect
  const browser = await connectCDPBrowser(savedConnection.cdpPort);
  if (!browser) {
    debugLog(`Failed to connect to CDP for user: ${user}`);
    await clearBrowserConnection(user);
    await releasePortForUser(user);
    return null;
  }

  debugLog(`Reconnected to existing CDP browser for user: ${user}`, {
    port: savedConnection.cdpPort,
  });

  return browser;
}

/**
 * Spawn a new CDP browser for a user
 *
 * @param user - User name
 * @param options - Launch options
 * @returns Browser instance
 */
async function spawnNewCDPBrowser(
  user: UserName,
  options: ProfileCDPLaunchOptions
): Promise<Browser> {
  const userDataDir = getUserDataDir(user);

  // Allocate port
  const portResult = await allocatePort(user);
  if (!portResult.success || !portResult.port) {
    throw new Error(`Failed to allocate CDP port for user: ${user}`);
  }

  const port = portResult.port;
  debugLog(`Spawning new CDP browser for user: ${user}`, { port, userDataDir });

  // Spawn detached browser (runs independently of CLI process)
  const spawnResult = await spawnCDPBrowserDetached(
    {
      user,
      headless: options.headless ?? config.headless,
      proxy: options.proxy ?? config.proxy,
      browserPath: options.browserPath ?? config.browserPath,
      browserChannel: options.browserChannel ?? config.browserChannel,
    },
    userDataDir
  );

  // Save connection info
  await saveBrowserConnection(user, {
    cdpPort: spawnResult.cdp.port,
    pid: spawnResult.pid,
    wsEndpoint: spawnResult.cdp.wsEndpoint,
    startedAt: spawnResult.cdp.connectedAt,
    lastActivityAt: spawnResult.cdp.lastActivityAt,
  });

  debugLog(`CDP browser spawned for user: ${user}`, {
    port: spawnResult.cdp.port,
    pid: spawnResult.pid,
  });

  // Connect to the spawned browser
  const browser = await connectCDPBrowser(spawnResult.cdp.port);
  if (!browser) {
    throw new Error(`Failed to connect to spawned CDP browser for user: ${user}`);
  }

  return browser;
}

// ============================================
// Main Entry Points
// ============================================

/**
 * Launch or connect to a CDP browser for a user
 *
 * This function will:
 * 1. Try to connect to existing CDP instance
 * 2. Spawn new instance if none exists
 * 3. Inject stealth scripts
 * 4. Return browser with page ready for use
 *
 * @param options - Launch options
 * @returns CDP browser result
 */
export async function launchProfileCDP(
  options: ProfileCDPLaunchOptions = {}
): Promise<ProfileCDPBrowserResult> {
  const { user: explicitUser, keepAlive = true, autoCreate = false } = options;

  // Resolve user
  const user = explicitUser ?? resolveUser();

  debugLog(`Launching CDP profile browser for user: ${user}`);

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

  // Load profile (fingerprint + meta with environmentType)
  const profile = await loadUserProfile(user);
  const fingerprint = profile.fingerprint;
  const environmentType = profile.meta.environmentType as EnvironmentType;
  const behavior = getStealthBehavior(environmentType);

  let browser: Browser;
  let isNewInstance: boolean;

  // Try to connect to existing instance
  const existingBrowser = await tryConnectExistingCDP(user);

  if (existingBrowser) {
    browser = existingBrowser;
    isNewInstance = false;
    debugLog(`Using existing CDP connection for user: ${user}`);
  } else {
    // Spawn new instance
    browser = await spawnNewCDPBrowser(user, options);
    isNewInstance = true;
    debugLog(`Created new CDP instance for user: ${user}`);
  }

  // Inject stealth into existing contexts
  await injectStealthToExistingContexts(browser, fingerprint);

  // Get or create context
  const contexts = browser.contexts();
  let context: BrowserContext;

  if (contexts.length > 0) {
    context = contexts[0];
  } else {
    context = await browser.newContext();
    // Inject stealth for new context
    const script = (await import('./stealth')).generateStealthScript(fingerprint);
    await context.addInitScript(script);
  }

  // Get or create page
  const pages = context.pages();
  let page: Page;

  if (pages.length > 0) {
    page = pages[0];
  } else {
    page = await createStealthPage(browser, fingerprint);
  }

  // Get CDP port from saved connection
  const savedConnection = await loadBrowserConnection(user);
  const cdpPort = savedConnection?.cdpPort ?? 0;

  debugLog(`CDP profile browser ready for user: ${user}`, {
    cdpPort,
    isNewInstance,
    keepAlive,
  });

  return {
    browser,
    context,
    page,
    user,
    environmentType,
    behavior,
    cdpPort,
    isNewInstance,
  };
}

/**
 * Convenience function to run operations within a CDP profile browser
 *
 * Automatically handles:
 * - Connection to existing CDP instance
 * - Spawning new instance if needed
 * - Stealth injection
 * - Browser lifecycle (keepAlive by default)
 *
 * @param user - User name
 * @param callback - Callback function receiving page
 * @param options - Launch options
 * @returns Callback result
 */
export async function withProfileCDP<T>(
  user: UserName,
  callback: (page: Page, result: Omit<ProfileCDPBrowserResult, 'page'>) => Promise<T>,
  options: Omit<ProfileCDPLaunchOptions, 'user'> = {}
): Promise<T> {
  const { keepAlive = true } = options;

  const result = await launchProfileCDP({ ...options, user });

  try {
    return await callback(result.page, {
      browser: result.browser,
      context: result.context,
      user: result.user,
      environmentType: result.environmentType,
      behavior: result.behavior,
      cdpPort: result.cdpPort,
      isNewInstance: result.isNewInstance,
    });
  } finally {
    if (keepAlive) {
      // For CDP-connected browsers, close() disconnects without killing the browser process
      // The browser keeps running and can be reconnected later
      await result.browser.close();
      debugLog(`Disconnected from CDP browser (keeping alive) for user: ${result.user}`, {
        port: result.cdpPort,
      });
    } else {
      // Close browser and clear connection
      await result.browser.close();
      await clearBrowserConnection(result.user);
      await releasePortForUser(result.user);
      debugLog(`Closed CDP browser for user: ${result.user}`);
    }
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Check if a CDP instance is running for a user
 *
 * @param user - User name
 * @returns True if CDP instance is running
 */
export async function hasCDPInstance(user: UserName): Promise<boolean> {
  const savedConnection = await loadBrowserConnection(user);
  if (!savedConnection?.cdpPort) {
    return false;
  }
  return await checkCDPConnection(savedConnection.cdpPort);
}

/**
 * Get CDP port for a user
 *
 * @param user - User name
 * @returns CDP port or null
 */
export async function getCDPPort(user: UserName): Promise<number | null> {
  const savedConnection = await loadBrowserConnection(user);
  return savedConnection?.cdpPort ?? null;
}

/**
 * Close CDP instance for a user
 *
 * @param user - User name
 */
export async function closeCDPInstance(user: UserName): Promise<void> {
  const savedConnection = await loadBrowserConnection(user);

  if (savedConnection?.cdpPort) {
    const browser = await connectCDPBrowser(savedConnection.cdpPort);
    if (browser) {
      await browser.close();
    }
  }

  await clearBrowserConnection(user);
  await releasePortForUser(user);
  debugLog(`Closed CDP instance for user: ${user}`);
}
