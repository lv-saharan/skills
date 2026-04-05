/**
 * CDP Browser Spawner
 *
 * @module browser/cdp-spawner
 * @description Spawns new CDP browser instances with proper configuration
 */

import type { Browser } from 'playwright';
import type { UserName } from '../user/types';
import { spawnCDPBrowserDetached } from './cdp/launcher';
import { connectCDPBrowser } from './cdp/connector';
import { allocatePort } from './cdp/port-allocator';
import { getUserDataDir } from '../user/storage';
import { saveConnectionInfo } from '../user/storage-v3';
import { config } from '../config';
import { debugLog } from '../utils/helpers';

export interface ProfileLaunchOptions {
  user?: UserName;
  headless?: boolean;
  proxy?: string;
  browserPath?: string;
  browserChannel?: string;
  timeout?: number;
  autoCreate?: boolean;
  keepAlive?: boolean;
}

/**
 * Spawn a new CDP browser instance for a user
 *
 * Handles: port allocation, process spawning, CDP connection, state persistence
 *
 * @param user - User name
 * @param options - Launch options
 * @returns Browser instance and allocated port
 */
export async function spawnNewCDPBrowser(
  user: UserName,
  options: ProfileLaunchOptions
): Promise<{ browser: Browser; port: number }> {
  const userDataDir = getUserDataDir(user);
  const portResult = await allocatePort(user);
  if (!portResult.success || !portResult.port) {
    throw new Error('Failed to allocate CDP port for user: ' + user);
  }

  const port = portResult.port;
  const headless = options.headless ?? config.headless;
  debugLog('Spawning new CDP browser for user: ' + user, { port, userDataDir, headless });

  const spawnResult = await spawnCDPBrowserDetached(
    {
      user,
      headless,
      proxy: options.proxy ?? config.proxy,
      browserPath: options.browserPath ?? config.browserPath,
      browserChannel: options.browserChannel ?? config.browserChannel,
    },
    userDataDir
  );

  await saveConnectionInfo(user, {
    cdpPort: spawnResult.cdp.port,
    pid: spawnResult.pid,
    wsEndpoint: spawnResult.cdp.wsEndpoint,
    headless: spawnResult.cdp.headless,
    startedAt: spawnResult.cdp.connectedAt,
    lastActivityAt: spawnResult.cdp.lastActivityAt,
  });

  const browser = await connectCDPBrowser(spawnResult.cdp.port);
  if (!browser) {
    throw new Error('Failed to connect to spawned CDP browser for user: ' + user);
  }

  return { browser, port };
}
