/**
 * Browser Command Registration
 *
 * @module cli/commands/browser.command
 * @description Browser management CLI commands (--start, --stop, --status, --list)
 *
 * All browser operations go through browser-launcher API in actions/shared/.
 * This module coordinates CLI commands with user management and browser lifecycle.
 */

import type { Command } from 'commander';
import { config } from '../../config';
import { resolveHeadless, outputFromError } from '../utils';
import type { BrowserCommandOptions, BrowserStatusResult } from '../types';
import {
  launchProfileBrowser,
  closeBrowserInstance,
  hasBrowserInstance,
  checkBrowserEndpointHealth,
  loadConnectionInfo,
} from '../../actions';

import { listUsers, resolveUser } from '../../user';
import { outputSuccess } from '../../core/utils/output';
import type { UserName } from '../../user/types';

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
async function startBrowser(options: BrowserCommandOptions): Promise<void> {
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
      port: result.port,
      pid: connection?.pid,
      headless: connection?.headless ?? false,
    },
    'RELAY:已为用户 ' +
      user +
      ' 启动浏览器实例 (端口：' +
      result.port +
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
 * Uses closeBrowserInstance API which implements layered shutdown:
 * 1. Graceful close via WebSocket
 * 2. Process kill fallback
 * 3. Connection cleanup
 */
async function stopBrowserForUser(user: UserName): Promise<{ stopped: boolean; error?: string }> {
  const isRunning = await hasBrowserInstance(user);
  if (!isRunning) {
    return { stopped: false, error: 'Browser not running' };
  }

  try {
    await closeBrowserInstance(user);
    return { stopped: true };
  } catch (error) {
    return { stopped: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Stop all browser instances
 */
async function stopAllBrowsers(): Promise<void> {
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
 * Scans all users and checks their browser connection status.
 * State is loaded from profile.json (no in-memory state).
 */
async function getBrowserStatus(): Promise<BrowserStatusResult> {
  const users = await listUsers();
  const instances: BrowserStatusResult['instances'] = {};

  let alive = 0;

  for (const user of users.users) {
    const conn = await loadConnectionInfo(user.name);
    if (conn?.port) {
      const isAlive = await checkBrowserEndpointHealth(conn.port);
      instances[user.name] = {
        port: conn.port,
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
async function handleBrowserCommand(options: BrowserCommandOptions): Promise<void> {
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
    outputFromError(error);
    process.exit(1);
  }
}

// ============================================
// Command Registration
// ============================================

export function registerBrowserCommand(program: Command): void {
  program
    .command('browser')
    .description('Manage browser instances')
    .option('--start', 'Start a browser instance')
    .option('--stop', 'Stop all browser instances')
    .option('--stop-user <name>', 'Stop browser for specific user')
    .option('--status', 'Show browser status')
    .option('--list', 'List saved connections')
    .option('--user <name>', 'User name')
    .option('--headless', 'Run in headless mode')
    .action(async (options) => {
      await handleBrowserCommand({
        start: options.start,
        stop: options.stop,
        stopUser: options.stopUser,
        status: options.status,
        list: options.list,
        user: options.user,
        headless: resolveHeadless(options.headless, config.headless),
      });
    });
}
