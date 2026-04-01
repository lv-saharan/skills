/**
 * Command Lifecycle Management
 *
 * @module browser/cdp/command-lifecycle
 * @description Manages browser page lifecycle for command execution
 */

import type { Browser, Page } from 'playwright';
import type { UserName } from '../../user/types';
import { browserInstanceManager } from './instance-manager';
import { healthMonitor } from './health-monitor';
import { getUserFingerprint } from '../../user/fingerprint';
import { createStealthPage, injectStealthToContext } from './stealth';
import { debugLog } from '../../utils/helpers';

// ============================================
// Main Page Lifecycle (for Login)
// ============================================

/**
 * Execute a callback with the main page
 *
 * Used for login commands. The main page is kept open after execution.
 *
 * @param user - User name
 * @param callback - Callback to execute with main page
 * @param config - Optional configuration
 * @returns Callback result
 *
 * @example
 * ```typescript
 * await withMainPage('user1', async (page, browser) => {
 *   await page.goto('https://www.xiaohongshu.com');
 *   // Perform login...
 *   // Main page stays open after callback completes
 * });
 * ```
 */
export async function withMainPage<T>(
  user: UserName,
  callback: (page: Page, browser: Browser) => Promise<T>,
  config: { headless?: boolean } = {}
): Promise<T> {
  // Get or create main page
  const mainPage = await browserInstanceManager.getOrCreateMainPage(user, config);

  // Get instance for browser reference
  const instance = browserInstanceManager.getActiveInstance(user);
  if (!instance) {
    throw new Error(`No browser instance for user: ${user}`);
  }

  // Update activity
  await browserInstanceManager.updateActivity(user);

  try {
    // Execute callback
    const result = await callback(mainPage, instance.browser);

    // Navigate to home page after login
    // This keeps the session active
    try {
      await mainPage.goto('https://www.xiaohongshu.com');
    } catch {
      // Ignore navigation errors
    }

    return result;
  } finally {
    // Mark main page as not in use
    browserInstanceManager.releaseMainPage(user);

    // Update activity again
    await browserInstanceManager.updateActivity(user);
  }
}

// ============================================
// Command Page Lifecycle (for Other Commands)
// ============================================

/**
 * Execute a callback with a new command page
 *
 * Used for search, interact, publish, scrape commands.
 * Creates a temporary page that is closed after execution.
 *
 * @param user - User name
 * @param callback - Callback to execute with command page
 * @param config - Optional configuration
 * @returns Callback result
 *
 * @example
 * ```typescript
 * await withCommandPage('user1', async (page, browser) => {
 *   await page.goto('https://www.xiaohongshu.com/search');
 *   // Perform search...
 *   // Page is automatically closed after callback
 * });
 * ```
 */
export async function withCommandPage<T>(
  user: UserName,
  callback: (page: Page, browser: Browser) => Promise<T>,
  config: { headless?: boolean } = {}
): Promise<T> {
  // Get or create browser instance
  const instance = await browserInstanceManager.getOrCreateInstance(user, config);

  // Ensure main page exists (for session continuity)
  await browserInstanceManager.getOrCreateMainPage(user, config);

  // Get fingerprint for stealth
  const fingerprint = await getUserFingerprint(user);

  // Create new command page with stealth
  const commandPage = await createStealthPage(instance.browser, fingerprint);

  // Update activity
  await browserInstanceManager.updateActivity(user);

  try {
    // Execute callback
    const result = await callback(commandPage, instance.browser);

    // Update activity
    await browserInstanceManager.updateActivity(user);

    return result;
  } finally {
    // Close command page
    try {
      if (!commandPage.isClosed()) {
        await commandPage.close();
      }
    } catch {
      // Ignore close errors
    }

    // Update activity
    await browserInstanceManager.updateActivity(user);

    debugLog(`Command page closed for user: ${user}`);
  }
}

// ============================================
// Command Context Lifecycle
// ============================================

/**
 * Execute a callback with a new browser context
 *
 * Used for commands that need isolated storage (separate cookies, localStorage).
 * The context is closed after execution.
 *
 * @param user - User name
 * @param callback - Callback to execute with context
 * @param config - Optional configuration
 * @returns Callback result
 */
export async function withCommandContext<T>(
  user: UserName,
  callback: (page: Page, browser: Browser) => Promise<T>,
  config: { headless?: boolean } = {}
): Promise<T> {
  // Get or create browser instance
  const instance = await browserInstanceManager.getOrCreateInstance(user, config);

  // Get fingerprint for stealth
  const fingerprint = await getUserFingerprint(user);

  // Create new context with stealth
  const context = await instance.browser.newContext();
  await injectStealthToContext(context, fingerprint);

  // Create page
  const page = await context.newPage();

  // Update activity
  await browserInstanceManager.updateActivity(user);

  try {
    // Execute callback
    const result = await callback(page, instance.browser);

    // Update activity
    await browserInstanceManager.updateActivity(user);

    return result;
  } finally {
    // Close context (includes page)
    try {
      await context.close();
    } catch {
      // Ignore close errors
    }

    // Update activity
    await browserInstanceManager.updateActivity(user);

    debugLog(`Command context closed for user: ${user}`);
  }
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize the CDP browser system
 *
 * Should be called at application startup.
 */
export function initializeCDPBrowserSystem(): void {
  // Start health monitor
  healthMonitor.start();

  // Setup lifecycle hooks
  // Note: This is done here for explicit control
  // setupLifecycleHooks();

  debugLog('CDP browser system initialized');
}

/**
 * Shutdown the CDP browser system
 *
 * Should be called at application shutdown.
 */
export async function shutdownCDPBrowserSystem(): Promise<void> {
  // Stop health monitor
  healthMonitor.stop();

  // Cleanup all instances
  await browserInstanceManager.cleanupAll();

  debugLog('CDP browser system shutdown complete');
}
