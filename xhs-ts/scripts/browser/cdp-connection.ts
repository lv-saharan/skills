/**
 * CDP Connection Management
 *
 * @module browser/cdp-connection
 * @description Manages CDP browser connections, reconnection, and cleanup
 */

import type { Browser } from 'playwright';
import type { UserName } from '../user/types';
import { connectCDPBrowser, checkCDPConnection } from './cdp/connector';
import { loadConnectionInfo, clearConnectionInfo } from '../user/storage-v3';
import { releasePortForUser } from './cdp/port-allocator';
import { debugLog, delay, waitForCondition } from '../utils/helpers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// ============================================
// Connection Management
// ============================================

/**
 * Try to reconnect to an existing CDP browser instance
 *
 * @param user - User name
 * @param requestedHeadless - Requested headless mode
 * @returns Browser and port if reconnection successful, null otherwise
 */
export async function tryConnectExistingCDP(
  user: UserName,
  requestedHeadless: boolean
): Promise<{ browser: Browser; port: number } | null> {
  const savedConnection = await loadConnectionInfo(user);
  if (!savedConnection?.cdpPort) {
    return null;
  }

  const savedHeadless = savedConnection.headless ?? false;
  if (savedHeadless !== requestedHeadless) {
    debugLog('Headless mode mismatch for user ' + user + ', closing existing instance.');
    await closeCDPInstance(user);
    return null;
  }

  const isResponsive = await checkCDPConnection(savedConnection.cdpPort);
  if (!isResponsive) {
    await clearConnectionInfo(user);
    await releasePortForUser(user);
    return null;
  }

  const browser = await connectCDPBrowser(savedConnection.cdpPort);
  if (!browser) {
    await clearConnectionInfo(user);
    await releasePortForUser(user);
    return null;
  }

  debugLog('Reconnected to existing CDP browser for user: ' + user, {
    port: savedConnection.cdpPort,
  });
  return { browser, port: savedConnection.cdpPort };
}

/**
 * Check if a CDP instance is running for a user
 */
export async function hasCDPInstance(user: UserName): Promise<boolean> {
  const connection = await loadConnectionInfo(user);
  if (!connection?.cdpPort) {
    return false;
  }
  return checkCDPConnection(connection.cdpPort);
}

/**
 * Get the CDP port for a user
 */
export async function getCDPPort(user: UserName): Promise<number | undefined> {
  const connection = await loadConnectionInfo(user);
  return connection?.cdpPort;
}

/**
 * Close a CDP instance with layered shutdown
 *
 * Level 1: CDP browser.close() (graceful)
 * Level 2: Process kill fallback (SIGKILL/taskkill)
 * Level 3: Connection state cleanup
 */
export async function closeCDPInstance(user: UserName): Promise<void> {
  const connection = await loadConnectionInfo(user);
  if (!connection?.cdpPort) {
    debugLog('No CDP instance to close for user: ' + user);
    return;
  }

  const { cdpPort, pid } = connection;

  try {
    const browser = await connectCDPBrowser(cdpPort, 5000);
    if (browser) {
      // CRITICAL: Close all pages first to prevent session restore
      // Chrome saves open tabs on normal shutdown, which get restored on next launch
      const contexts = browser.contexts();
      for (const context of contexts) {
        const pages = context.pages();
        for (const page of pages) {
          try {
            await page.close({ runBeforeUnload: false });
            debugLog('Closed page to prevent session restore for user: ' + user);
          } catch {
            // Page may be already closed
          }
        }
        // Close context to ensure no pages remain
        try {
          await context.close();
        } catch {
          // Context may have no pages or already closed
        }
      }

      // Small delay to ensure pages are fully closed
      await delay(500);

      // Now close browser - with no pages, nothing will be restored
      await browser.close();
      debugLog('Closed CDP browser via API (all pages closed first) for user: ' + user);
    }
  } catch {
    debugLog('CDP close failed for user: ' + user);
  }

  await delay(1000);

  // Check if browser is still alive and force kill if needed
  const stillAlive = await checkCDPConnection(cdpPort);
  if (stillAlive && pid) {
    debugLog('Browser still alive, force killing PID ' + pid);
    await forceKillProcess(pid);
  }

  await clearConnectionInfo(user);
  await releasePortForUser(user);
  debugLog('CDP instance closed for user: ' + user);
}

// ============================================
// Process Management
// ============================================

async function forceKillProcess(pid: number): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      await execAsync('taskkill /F /PID ' + pid);
    } else {
      process.kill(pid, 'SIGKILL');
    }
    await waitForCondition(
      async () => {
        try {
          process.kill(pid, 0);
          return false;
        } catch {
          return true;
        }
      },
      { timeout: 5000, interval: 500 }
    );
    return true;
  } catch {
    return false;
  }
}
