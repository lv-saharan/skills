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
 *
 * @param port - CDP port
 * @returns WebSocket endpoint URL
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
 *
 * @param port - CDP port
 * @returns Browser PID or undefined
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

// ============================================
// Browser Executable Finder
// ============================================

/**
 * Find browser executable path
 *
 * Searches Playwright's browser cache without loading Playwright.
 * This keeps Node.js handles free for CLI to exit.
 *
 * @param config - Browser configuration
 * @returns Browser executable path
 */
export async function findBrowserExecutablePath(
  config: Partial<BrowserInstanceConfig>
): Promise<string> {
  // Use provided path
  if (config.browserPath) {
    return config.browserPath;
  }

  // Try to find Playwright's chromium in browser cache manually
  // We do NOT use chromium.executablePath() as it loads Playwright
  const cacheDirs = [
    // Windows - most common
    path.join(process.env.LOCALAPPDATA || '', 'ms-playwright'),
    // Windows - alternative
    path.join(process.env.USERPROFILE || '', '.cache', 'ms-playwright'),
    // macOS
    path.join(process.env.HOME || '', '.cache', 'ms-playwright'),
    // Linux
    path.join(
      process.env.XDG_CACHE_HOME || path.join(process.env.HOME || '', '.cache'),
      'ms-playwright'
    ),
    // Global npm cache
    path.join(process.env.npm_config_cache || '', 'ms-playwright'),
  ];

  for (const cacheDir of cacheDirs) {
    if (fs.existsSync(cacheDir)) {
      try {
        // List all directories and find chromium
        const entries = fs.readdirSync(cacheDir, { withFileTypes: true });
        const chromiumDirs = entries
          .filter((e) => e.isDirectory() && e.name.startsWith('chromium'))
          .map((e) => e.name);

        for (const chromiumDir of chromiumDirs) {
          // Windows: chrome.exe in chromium-xxx/chrome-win64/ or chromium-xxx/
          // macOS: chrome inside chromium-xxx/chrome-mac/Chromium.app/Contents/MacOS/
          // Linux: chrome inside chromium-xxx/chrome-linux/
          const possiblePaths = [
            // Windows with chrome-win64 subdirectory
            path.join(cacheDir, chromiumDir, 'chrome-win64', 'chrome.exe'),
            // Windows direct
            path.join(cacheDir, chromiumDir, 'chrome.exe'),
            // Linux
            path.join(cacheDir, chromiumDir, 'chrome-linux', 'chrome'),
            // macOS
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

  // Throw error if not found
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
 * Later commands can connect via CDP when needed.
 *
 * Key features:
 * - Browser process is detached (parent can exit)
 * - No Playwright WebSocket connection (pure subprocess spawn)
 * - Browser persists across CLI invocations
 * - CLI can exit immediately after spawning
 *
 * @param config - Browser instance configuration
 * @param userDataDir - User data directory path for cookie persistence
 * @returns Spawn result with CDP metadata
 */
export async function spawnCDPBrowserDetached(
  config: BrowserInstanceConfig,
  userDataDir: string
): Promise<SpawnCDPResult> {
  // Allocate port
  const portResult = await allocatePort(config.user);
  if (!portResult.success || !portResult.port) {
    throw new Error(portResult.error || 'Failed to allocate CDP port');
  }

  const port = portResult.port;
  const now = new Date().toISOString();

  // Build launch args with user-data-dir and CDP port
  // CRITICAL: Avoid automation-related flags that trigger anti-bot detection
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
    // REMOVED: These flags expose automation and trigger anti-bot detection
    // '--disable-background-networking',
    // '--disable-sync',
    // '--disable-extensions',
    // '--disable-default-apps',
    // '--disable-translate',
  ];

  // Add headless mode if specified
  if (config.headless) {
    args.push('--headless');
  }

  // Add proxy if specified
  if (config.proxy) {
    args.push(`--proxy-server=${config.proxy}`);
  }

  // Find browser executable (without loading Playwright)
  const executablePath = await findBrowserExecutablePath(config);

  // Spawn browser as detached process
  // On Windows, use 'start' command to ensure process survives parent exit
  let browserProcess;
  let browserPid = 0;

  if (process.platform === 'win32') {
    // Windows: use 'start' command to launch browser in new process group
    // This ensures browser survives even when CLI exits
    const startArgs = [
      '""', // Window title (required when path has spaces)
      executablePath,
      ...args,
    ];
    browserProcess = spawn('start', startArgs, {
      detached: true,
      stdio: 'ignore',
      shell: true,
      windowsHide: config.headless ?? false,
    });
    // 'start' command returns immediately, so we don't get the actual browser PID
    // We'll rely on CDP port check to verify browser is running
    browserPid = 0;
  } else {
    // Unix: use standard detached spawn
    browserProcess = spawn(executablePath, args, {
      detached: true, // Important: allows parent process to exit independently
      stdio: 'ignore', // Don't capture stdout/stderr - prevents parent from waiting
      windowsHide: true, // Hide window on Windows (for headless)
    });
    browserPid = browserProcess.pid || 0;
  }

  // Unref the process so parent can exit without waiting for child
  browserProcess.unref();

  // Wait for CDP to be ready
  const readyTimeout = DEFAULT_CDP_READY_TIMEOUT;
  const startTime = Date.now();
  let isReady = false;

  while (Date.now() - startTime < readyTimeout) {
    isReady = await checkCDPReady(port, 1000);
    if (isReady) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!isReady) {
    // Try to kill the process if it started
    try {
      process.kill(browserPid);
    } catch {
      // Ignore kill errors
    }
    throw new Error(`CDP endpoint not ready within ${readyTimeout}ms on port ${port}`);
  }

  // Fetch WebSocket endpoint
  const wsEndpoint = await fetchWSEndpoint(port);

  // Build CDP metadata
  const cdp: CDPConnectionMeta = {
    port,
    endpointUrl: `http://127.0.0.1:${port}`,
    wsEndpoint,
    pid: browserPid,
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
 * Note: CLI will not exit until browser is closed or connection is released.
 *
 * @param config - Browser instance configuration
 * @returns Launch result with browser and CDP metadata
 */
export async function launchCDPBrowser(config: BrowserInstanceConfig): Promise<LaunchCDPResult> {
  // Lazy import Playwright to avoid keeping handles alive for spawnCDPBrowserDetached users
  const { chromium } = await import('playwright');

  // Allocate port
  const portResult = await allocatePort(config.user);
  if (!portResult.success || !portResult.port) {
    throw new Error(portResult.error || 'Failed to allocate CDP port');
  }

  const port = portResult.port;
  const now = new Date().toISOString();

  // Build launch args
  const args = [
    `--remote-debugging-port=${port}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
  ];

  // Add proxy if specified
  if (config.proxy) {
    args.push(`--proxy-server=${config.proxy}`);
  }

  // Launch browser
  const browser = await chromium.launch({
    headless: config.headless ?? false,
    args,
    executablePath: config.browserPath,
    channel: config.browserChannel,
  });

  // Wait for CDP to be ready
  const readyTimeout = DEFAULT_CDP_READY_TIMEOUT;
  const startTime = Date.now();
  let isReady = false;

  while (Date.now() - startTime < readyTimeout) {
    isReady = await checkCDPReady(port, 1000);
    if (isReady) {
      break;
    }
    // Small delay before retrying
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!isReady) {
    await browser.close();
    throw new Error(`CDP endpoint not ready within ${readyTimeout}ms on port ${port}`);
  }

  // Fetch WebSocket endpoint
  const wsEndpoint = await fetchWSEndpoint(port);

  // Build CDP metadata
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
 *
 * @param config - Browser instance configuration
 * @param userDataDir - User data directory path
 * @returns Launch result with browser and CDP metadata
 */
export async function launchCDPBrowserWithUserData(
  config: BrowserInstanceConfig,
  userDataDir: string
): Promise<LaunchCDPResult> {
  // Lazy import Playwright to avoid keeping handles alive for spawnCDPBrowserDetached users
  const { chromium } = await import('playwright');

  // Allocate port
  const portResult = await allocatePort(config.user);
  if (!portResult.success || !portResult.port) {
    throw new Error(portResult.error || 'Failed to allocate CDP port');
  }

  const port = portResult.port;
  const now = new Date().toISOString();

  // Build launch args with user-data-dir
  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
  ];

  // Add proxy if specified
  if (config.proxy) {
    args.push(`--proxy-server=${config.proxy}`);
  }

  // Launch browser via Playwright
  const browser = await chromium.launch({
    headless: config.headless ?? false,
    args,
    executablePath: config.browserPath,
    channel: config.browserChannel,
  });

  // Wait for CDP to be ready
  const readyTimeout = DEFAULT_CDP_READY_TIMEOUT;
  const startTime = Date.now();
  let isReady = false;

  while (Date.now() - startTime < readyTimeout) {
    isReady = await checkCDPReady(port, 1000);
    if (isReady) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  if (!isReady) {
    await browser.close();
    throw new Error(`CDP endpoint not ready within ${readyTimeout}ms on port ${port}`);
  }

  // Fetch WebSocket endpoint
  const wsEndpoint = await fetchWSEndpoint(port);

  // Build CDP metadata
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
