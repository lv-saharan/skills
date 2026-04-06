/**
 * Pure CDP Browser Launcher
 *
 * @module core/browser/launcher
 * @description Pure browser launch logic with NO user/platform dependencies
 *
 * All parameters are passed explicitly. This module does NOT:
 * - Load user profiles
 * - Access config
 * - Persist connection state
 *
 * The caller is responsible for:
 * - Providing userDataDir path
 * - Providing port number
 * - Saving/loading connection state
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import type { Browser, BrowserContext, Page } from 'playwright';
import { connectCDPBrowser, checkCDPConnection } from './cdp/connector';
import { checkCDPReady } from './port-utils';
import { generateStealthScript } from './stealth';
import type { UserFingerprint } from '../fingerprint/types';
import type { StealthBehaviorConfig } from './stealth-behavior';
import type { GeolocationConfig } from './stealth/types';
import type { BrowserInstance } from './types';
import { debugLog, waitForCondition } from '../utils';

// ============================================
// Types
// ============================================

/**
 * Browser launch options (all parameters explicit)
 */
export interface CDPLaunchOptions {
  /** Path to user data directory (e.g., users/default/user-data) */
  userDataDir: string;
  /** CDP debugging port */
  port: number;
  /** Run in headless mode */
  headless?: boolean;
  /** Proxy URL */
  proxy?: string;
  /** Custom browser executable path */
  browserPath?: string;
  /** Browser channel */
  browserChannel?: string;
}

/**
 * Stealth launch options
 */
export interface StealthLaunchOptions extends CDPLaunchOptions {
  /** User fingerprint for stealth injection */
  fingerprint: UserFingerprint;
  /** Stealth behavior configuration */
  behavior: StealthBehaviorConfig;
  /** Geolocation config (optional, defaults to Shanghai) */
  geolocation?: GeolocationConfig;
}

/**
 * Saved connection info (for reconnection)
 */
export interface SavedConnection {
  port: number;
  pid?: number;
  wsEndpoint?: string;
  headless: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_CDP_READY_TIMEOUT = 30000;

// ============================================
// Browser Executable Finder
// ============================================

/**
 * Find browser executable path
 *
 * Searches Playwright's browser cache without loading Playwright.
 */
export async function findBrowserExecutablePath(customPath?: string): Promise<string> {
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

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
// Spawn Browser (Detached Process)
// ============================================

/**
 * Spawn a CDP browser as a detached subprocess
 *
 * Returns connection info but does NOT connect via Playwright.
 * The browser runs as an independent process.
 */
export async function spawnCDPBrowser(
  options: CDPLaunchOptions
): Promise<{ port: number; pid: number; wsEndpoint?: string }> {
  const { userDataDir, port, headless = false, proxy, browserPath } = options;

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    '--start-maximized',
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-features=SessionRestore',
    '--restore-last-session=false',
    '--disable-session-crashed-bubble',
    '--disable-save-password-bubble',
  ];

  if (headless) {
    // Use new headless mode (Chrome 109+) - shares code with headed Chrome
    args.push('--headless=new');
    // Disable automation control flag to avoid detection
    args.push('--disable-blink-features=AutomationControlled');
  }

  if (proxy) {
    args.push(`--proxy-server=${proxy}`);
  }

  const executablePath = await findBrowserExecutablePath(browserPath);

  debugLog('[spawnCDPBrowser] Spawning browser', {
    port,
    headless,
    hasProxy: !!proxy,
  });

  const browserProcess = spawn(executablePath, args, {
    detached: true,
    stdio: 'ignore',
  });

  const pid = browserProcess.pid || 0;
  browserProcess.unref();

  // Wait for CDP to be ready
  const isReady = await waitForCDPReady(port, DEFAULT_CDP_READY_TIMEOUT);

  if (!isReady) {
    try {
      process.kill(pid);
    } catch {
      // Ignore kill errors
    }
    throw new Error(`CDP endpoint not ready within ${DEFAULT_CDP_READY_TIMEOUT}ms on port ${port}`);
  }

  const wsEndpoint = await fetchWSEndpoint(port);

  return { port, pid, wsEndpoint };
}

// ============================================
// Connection Functions
// ============================================

/**
 * Try to reconnect to an existing CDP browser
 *
 * @param savedConnection - Previously saved connection info
 * @param requestedHeadless - Requested headless mode
 * @returns Browser and port if reconnection successful, null otherwise
 */
export async function tryReconnectCDP(
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

  const isResponsive = await checkCDPConnection(savedConnection.port);
  if (!isResponsive) {
    return null;
  }

  const browser = await connectCDPBrowser(savedConnection.port);
  if (!browser) {
    return null;
  }

  debugLog('Reconnected to existing CDP browser', { port: savedConnection.port });
  return { browser, port: savedConnection.port };
}

// ============================================
// Main Launch Function
// ============================================

/**
 * Launch a browser instance with stealth injection
 *
 * This is the main entry point for browser launch.
 *
 * @param options - Launch options including fingerprint
 * @param savedConnection - Optional saved connection for reconnection attempt
 * @returns Browser instance with page ready for use
 */
export async function launchBrowser(
  options: StealthLaunchOptions,
  savedConnection?: SavedConnection | null
): Promise<BrowserInstance> {
  const { port, headless = false, fingerprint, geolocation } = options;

  // First, try reconnection if we have saved connection
  if (savedConnection) {
    const reconnected = await tryReconnectCDP(savedConnection, headless);
    if (reconnected) {
      // Successfully reconnected
      const result = await setupContext(reconnected.browser, fingerprint, geolocation);
      return {
        browser: reconnected.browser,
        context: result.context,
        page: result.page,
        port: reconnected.port,
        pid: savedConnection.pid || 0,
        wsEndpoint: savedConnection.wsEndpoint,
        isNewInstance: false,
      };
    }
  }

  // No reconnection possible, spawn new browser
  const spawned = await spawnCDPBrowser({ ...options, port });
  const browser = await connectCDPBrowser(spawned.port);
  if (!browser) {
    throw new Error(`Failed to connect to spawned CDP browser on port ${spawned.port}`);
  }

  const result = await setupContext(browser, fingerprint, geolocation);
  return {
    browser,
    context: result.context,
    page: result.page,
    port: spawned.port,
    pid: spawned.pid,
    wsEndpoint: spawned.wsEndpoint,
    isNewInstance: true,
  };
}

/**
 * Setup browser context with stealth injection
 */
async function setupContext(
  browser: Browser,
  fingerprint: UserFingerprint,
  geolocation?: GeolocationConfig
): Promise<{ context: BrowserContext; page: Page }> {
  const contexts = browser.contexts();
  let context: BrowserContext;

  if (contexts.length > 0) {
    context = contexts[0];

    // Inject stealth script (idempotent)  不需要反复注入
    await injectStealthToContext(context, fingerprint, geolocation);

    // NOTE: Do NOT clean up existing pages!
    // Each action manages only its own pages (create, use, close).
    // Cleaning up here would interfere with other concurrent actions.
  } else {
    context = await browser.newContext();
    await injectStealthToContext(context, fingerprint, geolocation);
  }

  // Create fresh page
  const page = await context.newPage();
  return { context, page };
}

/**
 * Close a browser instance
 *
 * @param port - CDP port
 * @param pid - Process ID (for force kill fallback)
 */
export async function closeBrowser(port: number, pid?: number): Promise<void> {
  try {
    const browser = await connectCDPBrowser(port, 5000);
    if (browser) {
      // Close all pages first to prevent session restore
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
      debugLog('Closed CDP browser via API');
    }
  } catch {
    debugLog('CDP close failed');
  }

  // Force kill if still alive
  const stillAlive = await checkCDPConnection(port);
  if (stillAlive && pid) {
    debugLog('Browser still alive, force killing PID ' + pid);
    await forceKillProcess(pid);
  }
}

// ============================================
// Stealth Injection
// ============================================

/**
 * Inject stealth script into a browser context
 */
export async function injectStealthToContext(
  context: BrowserContext,
  fingerprint: UserFingerprint,
  geolocation?: GeolocationConfig
): Promise<void> {
  const script = generateStealthScript(fingerprint, undefined, geolocation);
  await context.addInitScript(script);
}

// ============================================
// Helpers
// ============================================

/**
 * Fetch CDP WebSocket endpoint
 */
async function fetchWSEndpoint(port: number): Promise<string | undefined> {
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
 * Wait for CDP endpoint to be ready
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

/**
 * Force kill a process
 */
async function forceKillProcess(pid: number): Promise<boolean> {
  try {
    if (process.platform === 'win32') {
      const { exec } = await import('child_process');
      const { promisify } = await import('util');
      await promisify(exec)('taskkill /F /PID ' + pid);
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
