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
  diagnoseCorruptedUserData,
  type SavedConnection,
} from '../../core/browser/launcher';
import {
  isBrowserErrorCode,
  BrowserErrorCode,
  createUserDataCorruptedError,
} from '../../core/browser/errors';
import { allocatePortForIdentifier } from '../../core/browser/port-utils';
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
export { checkServerConnection, checkBrowserEndpointHealth } from '../../core/browser/connection';
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
  port: number;
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
 * Check if a browser instance is running for a user
 *
 * Supports both CDP and BrowserServer modes.
 * CDP browsers are launched with --remote-debugging-port, detected via HTTP endpoint.
 * BrowserServer browsers are launched via chromium.launchServer(), detected via WebSocket.
 *
 * IMPORTANT: CDP endpoints should use HTTP check or connectOverCDP, not BrowserServer WebSocket.
 */
export async function hasBrowserInstance(user: UserName): Promise<boolean> {
  const connection = await loadConnectionInfo(user);

  if (!connection?.port) {
    return false;
  }

  // Always use HTTP endpoint check for CDP-launched browsers
  // This is more reliable than WebSocket connection for CDP mode
  try {
    const response = await fetch(`http://127.0.0.1:${connection.port}/json/version`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get the port for a user's browser instance
 */
export async function getBrowserPort(user: UserName): Promise<number | undefined> {
  const connection = await loadConnectionInfo(user);
  return connection?.port;
}

/**
 * Close a browser instance for a user
 *
 * Supports BrowserServer (wsEndpoint) mode.
 */
export async function closeBrowserInstance(user: UserName): Promise<void> {
  const connection = await loadConnectionInfo(user);

  if (!connection) {
    debugLog('No browser instance to close for user: ' + user);
    return;
  }

  // Use new closeBrowser signature with wsEndpoint support
  await closeBrowser(connection.wsEndpoint, connection.pid);
  await clearConnectionInfo(user);
  debugLog('Browser instance closed for user: ' + user);
}

// ============================================
// Main Launch Function
// ============================================

/**
 * Launch a browser instance for a user profile
 *
 * Lifecycle:
 * 1. Resolve user → load profile → get behavior config
 * 2. Try reconnecting to existing browser instance
 * 3. If no existing instance, launch new BrowserServer
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

  // If headless mode mismatch, close old instance before spawning new one
  // (--headless is a launch argument, cannot change at runtime)
  if (savedConnection?.port && savedConnection.headless !== actualHeadless) {
    debugLog('Headless mode mismatch, closing old instance', {
      saved: savedConnection.headless,
      requested: actualHeadless,
    });
    await closeBrowserInstance(user);
    // Proceed with null connection to spawn new instance
  }

  // Prepare connection for reconnect (only if headless matches)
  const connectionForReconnect: SavedConnection | null =
    savedConnection?.port && savedConnection.headless === actualHeadless
      ? {
          port: savedConnection.port,
          pid: savedConnection.pid,
          wsEndpoint: savedConnection.wsEndpoint,
          headless: savedConnection.headless ?? false,
        }
      : null;

  // Launch browser using core launcher (now uses BrowserServer by default)
  // Wrap in try-catch to detect and diagnose user data corruption
  const userDataDir = getUserDataDir(user);
  let result;
  try {
    result = await launchBrowserCore(
      {
        userDataDir,
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
  } catch (launchError) {
    // Check if browser process died immediately - this indicates corrupted user data
    if (isBrowserErrorCode(launchError, BrowserErrorCode.PROCESS_TERMINATION_FAILED)) {
      debugLog('Browser process died during startup, diagnosing user data corruption...');

      // Diagnose by testing with a fresh temp directory
      const isCorrupted = await diagnoseCorruptedUserData(
        {
          userDataDir,
          port,
          headless: actualHeadless,
          proxy: actualProxy,
          browserPath: actualBrowserPath,
        },
        userDataDir
      );

      if (isCorrupted) {
        debugLog('Diagnosis confirmed: user data directory is corrupted');
        throw createUserDataCorruptedError(user, userDataDir);
      }

      // If not corrupted, re-throw original error
      throw launchError;
    }

    // For other errors, just re-throw
    throw launchError;
  }

  // Save connection info
  await saveConnectionInfo(user, {
    port: result.port!,
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
    port: result.port!,
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
      port: result.port,
      isNewInstance: result.isNewInstance,
    });
  } finally {
    // Close own page (each action manages only its own pages)
    if (!result.page.isClosed()) {
      try {
        await result.page.close({ runBeforeUnload: false });
        debugLog('Closed own page for user: ' + result.user);
      } catch {
        // Page may already be closed
      }
    }

    if (keepAlive) {
      // Disconnect from browser but keep it running
      await result.browser.close();
      debugLog('Disconnected from browser (keeping alive) for user: ' + result.user);
    } else {
      // Fully close the browser instance
      await closeBrowserInstance(result.user);
      debugLog('Closed browser instance for user: ' + result.user);
    }
  }
}
