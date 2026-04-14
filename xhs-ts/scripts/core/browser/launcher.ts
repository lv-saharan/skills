/**
 * Browser Launcher
 *
 * @module core/browser/launcher
 * @description Pure browser launch logic with NO user/platform dependencies
 *
 * This module coordinates browser lifecycle:
 * - launchBrowser(): Main entry point
 * - tryReconnectServer(): Reuse existing browser via CDP
 * - closeBrowser(): Graceful shutdown
 *
 * Implementation details are delegated to launcher/ subdirectory.
 */

import type { Browser } from 'playwright';
import { connectOverCDP, checkCDPConnection } from './connection/connector';
import { launchBrowserServer, setupBrowserContext } from './launcher/browser-launcher';
import { forceKillProcess, isProcessRunning, waitForProcessExit } from './launcher/process-manager';
import type { BrowserInstance, SavedConnection, LaunchBrowserOptions } from './types';
import { debugLog } from '../utils';

// Re-export types for convenience
export type { BrowserLaunchOptions, SavedConnection, LaunchBrowserOptions } from './types';

// Re-export from launcher/ subdirectory
export { findBrowserExecutablePath } from './launcher/executable-finder';
export {
  launchBrowserServer,
  setupBrowserContext,
  diagnoseCorruptedUserData,
} from './launcher/browser-launcher';
export { forceKillProcess, isProcessRunning, waitForProcessExit } from './launcher/process-manager';

// ============================================
// Reconnection
// ============================================

/**
 * Try to reconnect to an existing browser via CDP port
 *
 * For browsers launched with launchPersistentContext + CDP port,
 * we reconnect via CDP HTTP endpoint instead of WebSocket.
 *
 * @param savedConnection - Previously saved connection info
 * @param requestedHeadless - Requested headless mode
 * @returns Browser and port if reconnection successful, null otherwise
 */
export async function tryReconnectServer(
  savedConnection: SavedConnection | null,
  requestedHeadless: boolean
): Promise<{ browser: Browser; port: number } | null> {
  if (!savedConnection?.port) {
    return null;
  }

  const savedHeadless = savedConnection.headless ?? false;
  if (savedHeadless !== requestedHeadless) {
    debugLog('Headless mode mismatch, skipping reconnection');
    return null;
  }

  // Check CDP endpoint is responsive
  const isResponsive = await checkCDPConnection(savedConnection.port);
  if (!isResponsive) {
    return null;
  }

  // Connect via CDP
  const cdpEndpoint = 'http://127.0.0.1:' + savedConnection.port;
  const browser = await connectOverCDP(cdpEndpoint);
  if (!browser) {
    return null;
  }

  debugLog('Reconnected to existing browser via CDP', { port: savedConnection.port });
  return { browser, port: savedConnection.port };
}

// ============================================
// Main Launch Function
// ============================================

/**
 * Launch a browser instance with stealth injection
 *
 * This is the main entry point for browser launch.
 * Automatically reuses existing browser via CDP or launches new one.
 *
 * @param options - Launch options including fingerprint
 * @param savedConnection - Optional saved connection for reconnection attempt
 * @returns Browser instance with page ready for use
 */
export async function launchBrowser(
  options: LaunchBrowserOptions,
  savedConnection?: SavedConnection | null
): Promise<BrowserInstance> {
  const { headless = false, fingerprint, geolocation } = options;

  // Try reconnection if we have saved connection
  if (savedConnection?.port) {
    const reconnected = await tryReconnectServer(savedConnection, headless);
    if (reconnected) {
      const result = await setupBrowserContext(reconnected.browser, fingerprint, geolocation);
      return {
        browser: reconnected.browser,
        context: result.context,
        page: result.page,
        port: reconnected.port,
        pid: savedConnection.pid || 0,
        wsEndpoint: 'ws://127.0.0.1:' + savedConnection.port + '/',
        isNewInstance: false,
      };
    }
  }

  // No reconnection possible, launch new browser with persistent context
  // Pass fingerprint userAgent to override HeadlessChrome HTTP header
  // Pass fingerprint screen dimensions to match --window-size with stealth screen spoofing
  const launched = await launchBrowserServer({
    ...options,
    userAgent: fingerprint.browser.userAgent,
    viewportWidth: fingerprint.screen.width,
    viewportHeight: fingerprint.screen.height,
  });

  // Connect via CDP to get Browser instance
  const cdpEndpoint = 'http://127.0.0.1:' + launched.port;
  const browser = await connectOverCDP(cdpEndpoint);
  if (!browser) {
    throw new Error('Failed to connect to launched browser on CDP port ' + launched.port);
  }

  const result = await setupBrowserContext(browser, fingerprint, geolocation);
  return {
    browser,
    context: result.context,
    page: result.page,
    port: launched.port,
    pid: launched.pid,
    wsEndpoint: launched.wsEndpoint,
    isNewInstance: true,
  };
}

// ============================================
// Browser Close
// ============================================

/**
 * Close a browser instance
 *
 * Uses graceful close via CDP connection, with PID kill fallback.
 * Waits for process to fully exit before returning to prevent user-data-dir lock conflicts.
 *
 * @param wsEndpoint - WebSocket endpoint (not used for CDP, kept for compatibility)
 * @param pid - Process ID (for kill fallback)
 */
export async function closeBrowser(wsEndpoint?: string, pid?: number): Promise<void> {
  // Extract port from wsEndpoint if available
  let port: number | undefined;
  if (wsEndpoint) {
    const match = wsEndpoint.match(/ws:\/\/127\.0\.0\.1:(\d+)/);
    if (match) {
      port = parseInt(match[1], 10);
    }
  }

  let closedViaCDP = false;

  // Method 1: Try graceful close via CDP connection
  if (port) {
    try {
      const browser = await connectOverCDP('http://127.0.0.1:' + port, 5000);
      if (browser) {
        const contexts = browser.contexts();
        for (const context of contexts) {
          const pages = context.pages();
          for (const page of pages) {
            try {
              await page.close({ runBeforeUnload: false });
            } catch {
              // Page may be already closed
            }
          }
          try {
            await context.close();
          } catch {
            // Context may have no pages
          }
        }
        await browser.close();
        closedViaCDP = true;
        debugLog('Closed browser via CDP connection');
      }
    } catch {
      debugLog('CDP close failed, falling back to PID kill');
    }
  }

  // Method 2: Force kill via PID (fallback or if CDP didn't fully terminate)
  if (pid && pid > 0) {
    const stillAlive = port ? await checkCDPConnection(port) : false;
    const processAlive = isProcessRunning(pid);
    if (stillAlive || (closedViaCDP && processAlive)) {
      if (stillAlive) {
        debugLog('Browser still alive, force killing PID ' + pid);
      } else if (processAlive) {
        debugLog('Browser process still running after CDP close, force killing PID ' + pid);
      }
      await forceKillProcess(pid);
    }
  }

  // Wait for process to fully exit (prevents user-data-dir lock race condition)
  // Chromium needs time to release file locks (SingletonLock, SingletonCookie) after close
  if (pid && pid > 0 && isProcessRunning(pid)) {
    debugLog('Waiting for browser process to exit...');
    const exited = await waitForProcessExit(pid, 5000);
    if (!exited) {
      debugLog('Browser process did not exit in time, force killing');
      await forceKillProcess(pid);
    }
  }
}
