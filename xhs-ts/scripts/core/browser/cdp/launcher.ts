/**
 * CDP Browser Launcher
 *
 * @module browser/cdp/launcher
 * @description Launches Chromium browser with CDP debugging port exposed
 *
 * IMPORTANT: This module uses lazy Playwright imports to avoid keeping
 * Node.js handles alive. The spawnCDPBrowserDetached function is completely
 * Playwright-free and allows CLI to exit immediately.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { Browser } from 'playwright';
import {
  DEFAULT_CDP_READY_TIMEOUT,
  type CDPConnectionMeta,
  type BrowserInstanceConfig,
} from './types';
import { allocatePort, checkCDPReady } from './port-allocator';
import { debugLog, waitForCondition } from '../../../core/utils';

// ============================================
// Types
// ============================================

/**
 * Result of launching a CDP browser (with Playwright connection)
 */
export interface LaunchCDPResult {
  browser: Browser;
  cdp: CDPConnectionMeta;
}

/**
 * Result of spawning a detached CDP browser (without Playwright connection)
 */
export interface SpawnCDPResult {
  cdp: CDPConnectionMeta;
  /** Browser process ID */
  pid: number;
}

// ============================================
// CDP Helper Functions
// ============================================

/**
 * Fetch CDP WebSocket endpoint
 */
export async function fetchWSEndpoint(port: number): Promise<string | undefined> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (response.ok) {
      const data = (await response.json()) as { webSocketDebuggerUrl?: string };
      return data.webSocketDebuggerUrl;
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Get browser PID via CDP (limited, as CDP doesn't expose PID directly)
 */
export async function fetchBrowserPid(port: number): Promise<number | undefined> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (response.ok) {
      const _data = (await response.json()) as { Browser?: string };
      // PID is not directly exposed in CDP, return undefined
    }
  } catch {
    // Ignore errors
  }
  return undefined;
}

/**
 * Wait for CDP endpoint to be ready
 *
 * Uses waitForCondition to avoid manual while loops.
 * Returns true if ready, false if timeout.
 */
async function waitForCDPReady(port: number, timeout: number): Promise<boolean> {
  try {
    await waitForCondition(async () => checkCDPReady(port, 1000), {
      timeout,
      interval: 500,
      timeoutMessage: `CDP endpoint not ready on port ${port}`,
    });
    return true;
  } catch {
    return false;
  }
}

// ============================================
// Browser Executable Finder
// ============================================

/**
 * Find browser executable path
 *
 * Searches Playwright's browser cache without loading Playwright.
 * This keeps Node.js handles free for CLI to exit.
 */
export async function findBrowserExecutablePath(
  config: Partial<BrowserInstanceConfig>
): Promise<string> {
  // Use provided path
  if (config.browserPath) {
    return config.browserPath;
  }

  // Try to find Playwright's chromium in browser cache manually
  const cacheDirs = [
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),
    path.join(process.env.USERPROFILE || '', '.cache', 'ms-playwright'),
    path.join(process.env.HOME || '', '.cache', 'ms-playwright'),
    path.join(
      process.env.XDG_CACHE_HOME || path.join(process.env.HOME || '', '.cache'),
      'ms-playwright'
    ),
    path.join(process.env.npm_config_cache || '', 'ms-playwright'),
  ];

  for (const cacheDir of cacheDirs) {
    if (fs.existsSync(cacheDir)) {
      try {
        const entries = fs.readdirSync(cacheDir, { withFileTypes: true });
        const chromiumDirs = entries
          .filter((e) => e.isDirectory() && e.name.startsWith('chromium'))
          .map((e) => e.name);

        for (const chromiumDir of chromiumDirs) {
          const possiblePaths = [
            path.join(cacheDir, chromiumDir, 'chrome-win64', 'chrome.exe'),
            path.join(cacheDir, chromiumDir, 'chrome.exe'),
            path.join(cacheDir, chromiumDir, 'chrome-linux', 'chrome'),
            path.join(
              cacheDir,
              chromiumDir,
              'chrome-mac',
              'Chromium.app',
              'Contents',
              'MacOS',
              'Chromium'
            ),
          ];

          for (const exePath of possiblePaths) {
            if (fs.existsSync(exePath)) {
              return exePath;
            }
          }
        }
      } catch {
        // Ignore errors, try next directory
      }
    }
  }

  throw new Error(
    'Chromium browser not found. Please install Playwright browsers with: npm run install:browser'
  );
}

// ============================================
// Spawn-based Browser Launch (Detached)
// ============================================

/**
 * Spawn a CDP browser as a detached subprocess
 *
 * This launches the browser WITHOUT connecting via Playwright.
 * The browser runs as an independent process, allowing the CLI to exit immediately.
 */
export async function spawnCDPBrowserDetached(
  config: BrowserInstanceConfig,
  userDataDir: string
): Promise<SpawnCDPResult> {
  const portResult = await allocatePort(config.user);
  if (!portResult.success || !portResult.port) {
    throw new Error(portResult.error || 'Failed to allocate CDP port');
  }

  const port = portResult.port;
  const now = new Date().toISOString();

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
    // Disable session restore to prevent pages from existing before addInitScript
    '--disable-features=SessionRestore',
    // Explicitly disable session restore from last session
    '--restore-last-session=false',
    // Disable session crash bubble that might restore tabs
    '--disable-session-crashed-bubble',
    // Prevent Chrome from saving session state
    '--disable-save-password-bubble',
  ];

  if (config.headless) {
    args.push('--headless');
  }

  if (config.proxy) {
    args.push(`--proxy-server=${config.proxy}`);
  }

  const executablePath = await findBrowserExecutablePath(config);

  debugLog(`[spawnCDPBrowserDetached] Spawning browser with config:`, {
    headless: config.headless,
    hasProxy: !!config.proxy,
    args: args.join(' '),
  });

  const browserProcess = spawn(executablePath, args, {
    detached: true,
    stdio: 'ignore',
  });
  const browserPid = browserProcess.pid || 0;

  browserProcess.unref();

  // Wait for CDP to be ready using waitForCondition
  const isReady = await waitForCDPReady(port, DEFAULT_CDP_READY_TIMEOUT);

  if (!isReady) {
    try {
      process.kill(browserPid);
    } catch {
      // Ignore kill errors
    }
    throw new Error(`CDP endpoint not ready within ${DEFAULT_CDP_READY_TIMEOUT}ms on port ${port}`);
  }

  const wsEndpoint = await fetchWSEndpoint(port);

  const cdp: CDPConnectionMeta = {
    port,
    endpointUrl: `http://127.0.0.1:${port}`,
    wsEndpoint,
    pid: browserPid,
    headless: config.headless ?? false,
    connectedAt: now,
    lastActivityAt: now,
  };

  return { cdp, pid: browserPid };
}

// ============================================
// Playwright-based Browser Launch (Connected)
// ============================================

/**
 * Launch a Chromium browser with CDP debugging port via Playwright
 *
 * This connects to the browser via Playwright, which maintains WebSocket connections.
 * Use this when you need to control the browser directly from CLI.
 */
export async function launchCDPBrowser(config: BrowserInstanceConfig): Promise<LaunchCDPResult> {
  const { chromium } = await import('playwright');

  const portResult = await allocatePort(config.user);
  if (!portResult.success || !portResult.port) {
    throw new Error(portResult.error || 'Failed to allocate CDP port');
  }

  const port = portResult.port;
  const now = new Date().toISOString();

  const args = [
    `--remote-debugging-port=${port}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
  ];

  if (config.proxy) {
    args.push(`--proxy-server=${config.proxy}`);
  }

  const browser = await chromium.launch({
    headless: config.headless ?? false,
    args,
    executablePath: config.browserPath,
    channel: config.browserChannel,
  });

  // Wait for CDP to be ready using waitForCondition
  const isReady = await waitForCDPReady(port, DEFAULT_CDP_READY_TIMEOUT);

  if (!isReady) {
    await browser.close();
    throw new Error(`CDP endpoint not ready within ${DEFAULT_CDP_READY_TIMEOUT}ms on port ${port}`);
  }

  const wsEndpoint = await fetchWSEndpoint(port);

  const cdp: CDPConnectionMeta = {
    port,
    endpointUrl: `http://127.0.0.1:${port}`,
    wsEndpoint,
    pid: await fetchBrowserPid(port),
    connectedAt: now,
    lastActivityAt: now,
  };

  return { browser, cdp };
}

/**
 * Launch browser with user data directory via Playwright
 *
 * This connects to the browser via Playwright with persistent user data.
 * Use this when you need to control the browser directly with cookie persistence.
 */
export async function launchCDPBrowserWithUserData(
  config: BrowserInstanceConfig,
  userDataDir: string
): Promise<LaunchCDPResult> {
  const { chromium } = await import('playwright');

  const portResult = await allocatePort(config.user);
  if (!portResult.success || !portResult.port) {
    throw new Error(portResult.error || 'Failed to allocate CDP port');
  }

  const port = portResult.port;
  const now = new Date().toISOString();

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
  ];

  if (config.proxy) {
    args.push(`--proxy-server=${config.proxy}`);
  }

  const browser = await chromium.launch({
    headless: config.headless ?? false,
    args,
    executablePath: config.browserPath,
    channel: config.browserChannel,
  });

  // Wait for CDP to be ready using waitForCondition
  const isReady = await waitForCDPReady(port, DEFAULT_CDP_READY_TIMEOUT);

  if (!isReady) {
    await browser.close();
    throw new Error(`CDP endpoint not ready within ${DEFAULT_CDP_READY_TIMEOUT}ms on port ${port}`);
  }

  const wsEndpoint = await fetchWSEndpoint(port);

  const cdp: CDPConnectionMeta = {
    port,
    endpointUrl: `http://127.0.0.1:${port}`,
    wsEndpoint,
    pid: await fetchBrowserPid(port),
    connectedAt: now,
    lastActivityAt: now,
  };

  return { browser, cdp };
}
