/**
 * Browser command handlers
 *
 * @module core/browser/commands
 * @description CLI command handlers for browser management (--start, --stop, --status)
 *
 * All browser operations go through profile-launcher API.
 * No direct CDP module access - proper abstraction layering.
 */

import type { UserName } from '../../user/types';
import { launchProfileBrowser, closeCDPInstance, hasCDPInstance } from './profile-launcher';
import { loadConnectionInfo } from '../../user/storage-v3';
import { listUsers, resolveUser } from '../../user';
import { checkCDPConnection } from './cdp/connector';
import { outputSuccess, outputError } from '../utils/output';
import { XhsErrorCode } from '../../config';

// ============================================
// Types
// ============================================

export interface BrowserCommandOptions {
  user?: string;
  headless?: boolean;
}

export interface BrowserStatusResult {
  total: number;
  alive: number;
  instances: Record<
    string,
    { cdpPort: number; pid?: number; headless?: boolean; lastActivityAt?: string; isAlive: boolean }
  >;
}

// ============================================
// Command Handlers
// ============================================

/**
 * Start a detached browser instance
 *
 * Uses launchProfileBrowser API which handles:
 * - Port allocation
 * - Browser spawning
 * - Connection persistence
 * - Headless mode mismatch detection
 */
export async function startBrowser(options: BrowserCommandOptions): Promise<void> {
  const user = resolveUser(options.user);

  const result = await launchProfileBrowser({
    user,
    headless: options.headless ?? false,
  });

  // Get connection info (includes saved headless state)
  const connection = await loadConnectionInfo(user);

  outputSuccess(
    {
      user,
      cdpPort: result.cdpPort,
      pid: connection?.pid,
      headless: connection?.headless ?? false,
    },
    'RELAY:已为用户 ' +
      user +
      ' 启动浏览器实例 (端口: ' +
      result.cdpPort +
      ', headless: ' +
      (connection?.headless ?? false) +
      ')'
  );

  // Allow CLI to exit while browser keeps running
  process.stdin?.destroy();
  process.stdout?.destroy();
  process.stderr?.destroy();
  process.exit(0);
}

/**
 * Stop a browser instance for a specific user
 *
 * Uses closeCDPInstance API which implements layered shutdown:
 * 1. CDP graceful close
 * 2. Process kill fallback
 * 3. Connection cleanup
 */
export async function stopBrowserForUser(
  user: UserName
): Promise<{ stopped: boolean; error?: string }> {
  const isRunning = await hasCDPInstance(user);
  if (!isRunning) {
    return { stopped: false, error: 'Browser not running' };
  }

  try {
    await closeCDPInstance(user);
    return { stopped: true };
  } catch (error) {
    return { stopped: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Stop all browser instances
 */
export async function stopAllBrowsers(): Promise<void> {
  const status = await getBrowserStatus();
  const results: { user: string; stopped: boolean; error?: string }[] = [];

  for (const user of Object.keys(status.instances)) {
    const result = await stopBrowserForUser(user);
    results.push({ user, ...result });
  }

  const stoppedCount = results.filter((r) => r.stopped).length;
  const failedCount = results.filter((r) => !r.stopped).length;

  outputSuccess(
    { stopped: stoppedCount, failed: failedCount, details: results },
    'RELAY:已关闭 ' + stoppedCount + ' 个浏览器实例'
  );
}

/**
 * Get browser status
 *
 * Scans all users and checks their CDP connection status.
 * State is loaded from profile.json (no in-memory state).
 */
export async function getBrowserStatus(): Promise<BrowserStatusResult> {
  const users = await listUsers();
  const instances: BrowserStatusResult['instances'] = {};

  let alive = 0;

  for (const user of users.users) {
    const conn = await loadConnectionInfo(user.name);
    if (conn?.cdpPort) {
      const isAlive = await checkCDPConnection(conn.cdpPort);
      instances[user.name] = {
        cdpPort: conn.cdpPort,
        pid: conn.pid,
        headless: conn.headless,
        lastActivityAt: conn.lastActivityAt,
        isAlive,
      };
      if (isAlive) {
        alive++;
      }
    }
  }

  return {
    total: Object.keys(instances).length,
    alive,
    instances,
  };
}

/**
 * Handle browser command from CLI
 */
export async function handleBrowserCommand(options: {
  start?: boolean;
  stop?: boolean;
  stopUser?: string;
  status?: boolean;
  list?: boolean;
  user?: string;
  headless?: boolean;
}): Promise<void> {
  try {
    if (options.start) {
      return await startBrowser({ user: options.user, headless: options.headless });
    }

    if (options.stop) {
      return await stopAllBrowsers();
    }

    if (options.stopUser) {
      const result = await stopBrowserForUser(options.stopUser);
      if (result.stopped) {
        outputSuccess(
          { stopped: options.stopUser },
          'RELAY:已关闭用户 ' + options.stopUser + ' 的浏览器实例'
        );
      } else {
        outputSuccess(
          { user: options.stopUser, error: result.error },
          'RELAY:用户 ' + options.stopUser + ' 的浏览器实例已停止或不存在'
        );
      }
      return;
    }

    if (options.list) {
      const status = await getBrowserStatus();
      outputSuccess(
        {
          total: status.total,
          alive: status.alive,
          connections: status.instances,
        },
        'PARSE:browserConnections'
      );
      return;
    }

    // Default: show status
    const status = await getBrowserStatus();
    outputSuccess(status, 'PARSE:browserStatus');
  } catch (error) {
    outputError(error instanceof Error ? error.message : String(error), XhsErrorCode.BROWSER_ERROR);
    process.exit(1);
  }
}
