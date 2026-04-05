/**
 * Browser Launcher with User Orchestration
 *
 * @module actions/shared/browser-launcher
 * @description High-level browser launch API that orchestrates user management and browser lifecycle
 *
 * This module IS platform-specific and depends on:
 * - user/ module for profile management
 * - config/ module for platform settings
 * - core/browser/launcher for pure browser logic
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { UserName, EnvironmentType } from '../../user/types';
import type { StealthBehaviorConfig } from '../../core/browser/stealth-behavior';
import {
  launchBrowser as launchBrowserCore,
  closeBrowser,
  type SavedConnection,
} from '../../core/browser/launcher';
import { allocatePortForIdentifier, checkCDPReady } from '../../core/browser/port-utils';
import { getStealthBehavior } from '../../core/browser/stealth-behavior';
import { hasProfile, createUserProfile, getUserDataDir } from '../../user/storage';
import { loadUserProfile } from '../../user/profile-loader';
import {
  loadConnectionInfo,
  saveConnectionInfo,
  clearConnectionInfo,
  updateProfileLastUsed,
} from '../../user/storage-v3';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { debugLog } from '../../core/utils';

// ============================================
// Re-exports
// ============================================

// Re-export types needed by consumers
export type { StealthBehaviorConfig } from '../../core/browser/stealth-behavior';

// Re-export utilities needed by CLI
export { checkCDPConnection } from '../../core/browser/cdp/connector';
export { loadConnectionInfo, saveConnectionInfo, clearConnectionInfo } from '../../user/storage-v3';

// ============================================
// Types
// ============================================

export interface ProfileLaunchOptions {
  user?: UserName;
  headless?: boolean;
  proxy?: string;
  browserPath?: string;
  browserChannel?: string;
  autoCreate?: boolean;
  keepAlive?: boolean;
}

export interface ProfileBrowserResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  user: UserName;
  environmentType: EnvironmentType;
  behavior: StealthBehaviorConfig;
  cdpPort: number;
  isNewInstance: boolean;
}

// ============================================
// Random Stealth Delay
// ============================================

/**
 * Random delay based on stealth behavior configuration
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
  await new Promise((r) => setTimeout(r, delayMs));
}

// ============================================
// Connection Management
// ============================================

/**
 * Check if a CDP instance is running for a user
 */
export async function hasCDPInstance(user: UserName): Promise<boolean> {
  const connection = await loadConnectionInfo(user);
  if (!connection?.cdpPort) {
    return false;
  }
  return checkCDPReady(connection.cdpPort);
}

/**
 * Get the CDP port for a user
 */
export async function getCDPPort(user: UserName): Promise<number | undefined> {
  const connection = await loadConnectionInfo(user);
  return connection?.cdpPort;
}

/**
 * Close a CDP instance for a user
 */
export async function closeCDPInstance(user: UserName): Promise<void> {
  const connection = await loadConnectionInfo(user);
  if (!connection?.cdpPort) {
    debugLog('No CDP instance to close for user: ' + user);
    return;
  }

  await closeBrowser(connection.cdpPort, connection.pid);
  await clearConnectionInfo(user);
  debugLog('CDP instance closed for user: ' + user);
}

// ============================================
// Main Launch Function
// ============================================

/**
 * Launch a browser instance for a user profile
 *
 * Lifecycle:
 * 1. Resolve user → load profile → get behavior config
 * 2. Try reconnecting to existing CDP instance
 * 3. If no existing instance, spawn new one
 * 4. Inject stealth script into context
 * 5. Create fresh page and return result
 */
export async function launchProfileBrowser(
  options: ProfileLaunchOptions = {}
): Promise<ProfileBrowserResult> {
  const {
    user: explicitUser,
    headless,
    autoCreate = false,
    proxy,
    browserPath,
    browserChannel,
  } = options;
  const user = resolveUser(explicitUser);

  // Ensure profile exists
  if (!hasProfile(user)) {
    if (autoCreate) {
      debugLog('Profile does not exist, creating for user: ' + user);
      const { detectEnvironmentType } = await import('../../user/environment');
      const envType = detectEnvironmentType();
      await createUserProfile(user, envType);
    } else {
      throw new Error('Profile does not exist for user: ' + user + '. Use autoCreate: true.');
    }
  }

  // Load profile
  const profile = await loadUserProfile(user);
  const environmentType = profile.meta.environmentType as EnvironmentType;
  const behavior = getStealthBehavior(environmentType);

  debugLog('Profile loaded for ' + user, {
    environmentType,
    hasFingerprint: !!profile.fingerprint,
  });

  // Determine options
  const actualHeadless = headless ?? config.headless;
  const actualProxy = proxy ?? config.proxy;
  const actualBrowserPath = browserPath ?? config.browserPath;
  const actualBrowserChannel = browserChannel ?? config.browserChannel;

  // Allocate port
  const port = await allocatePortForIdentifier(user);

  // Load saved connection for reconnection attempt
  const savedConnection = await loadConnectionInfo(user);
  const connectionForReconnect: SavedConnection | null = savedConnection?.cdpPort
    ? {
        port: savedConnection.cdpPort,
        pid: savedConnection.pid,
        wsEndpoint: savedConnection.wsEndpoint,
        headless: savedConnection.headless ?? false,
      }
    : null;

  // Launch browser using core launcher
  const result = await launchBrowserCore(
    {
      userDataDir: getUserDataDir(user),
      port,
      headless: actualHeadless,
      proxy: actualProxy,
      browserPath: actualBrowserPath,
      browserChannel: actualBrowserChannel,
      fingerprint: profile.fingerprint,
      behavior,
      geolocation: profile.geolocation,
    },
    connectionForReconnect
  );

  // Save connection info
  await saveConnectionInfo(user, {
    cdpPort: result.port!,
    pid: result.pid!,
    wsEndpoint: result.wsEndpoint,
    headless: actualHeadless,
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
  });

  // Update last used
  await updateProfileLastUsed(user);

  return {
    browser: result.browser,
    context: result.context,
    page: result.page,
    user,
    environmentType,
    behavior,
    cdpPort: result.port!,
    isNewInstance: result.isNewInstance!,
  };
}

/**
 * High-level API: acquire browser, run callback, manage lifecycle
 *
 * @param user - User name
 * @param callback - Async function receiving page and profile result
 * @param options - Launch options (headless, keepAlive, etc.)
 * @returns Callback result
 */
export async function withProfile<T>(
  user: UserName,
  callback: (page: Page, result: Omit<ProfileBrowserResult, 'page'>) => Promise<T>,
  options: Omit<ProfileLaunchOptions, 'user'> = {}
): Promise<T> {
  const { keepAlive = true } = options;
  const result = await launchProfileBrowser({ ...options, user });

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
      // Disconnect from browser but keep it running
      await result.browser.close();
      debugLog('Disconnected from CDP browser (keeping alive) for user: ' + result.user);
    } else {
      // Fully close the browser instance
      await closeCDPInstance(result.user);
      debugLog('Closed CDP instance for user: ' + result.user);
    }
  }
}
