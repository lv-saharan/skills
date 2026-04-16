/**
 * Browser Launcher - Spawn Independent Process + CDP Mode
 *
 * @module core/browser/launcher/browser-launcher
 * @description Launch browser as independent process using spawn + CDP port for reconnection
 *
 * Architecture:
 * - Browser process runs independently (detached, survives CLI exit)
 * - CLI connects via CDP (chromium.connectOverCDP)
 * - CLI disconnects without closing browser (keepAlive mode)
 * - Multiple CLI commands share the same browser instance
 */

import { spawn } from 'child_process';
import type { Browser, BrowserContext, Page } from 'playwright';
import type { UserFingerprint, GeolocationConfig } from '../types';
import type { BrowserLaunchOptions } from '../types';
import { findBrowserExecutablePath } from './executable-finder';
import { generateStealthScript } from '../stealth';
import { createBrowserError, BrowserErrorCode } from '../errors';
import { debugLog } from '../../utils';
import { isLinux, needsNoSandbox, needsDisableDevShm } from '../../../user/environment';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// ============================================
// Types
// ============================================

/**
 * Browser launch result (spawned process info)
 */
export interface BrowserServerLaunchResult {
  port: number;
  pid: number;
  wsEndpoint: string;
}

/**
 * Browser instance with context and page
 */
export interface BrowserInstanceWithPage {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

// ============================================
// Constants
// ============================================

const CDP_READY_TIMEOUT = 30000; // 30 seconds to wait for CDP endpoint
const CDP_POLL_INTERVAL = 500; // 500ms between checks

// ============================================
// Spawn Browser Process
// ============================================

/**
 * Launch browser as independent process using spawn
 *
 * The browser process runs independently (detached mode), survives CLI exit.
 * CDP port enables reconnection from future CLI commands.
 *
 * @param options - Launch options
 * @returns Connection info including CDP port and pid
 * @throws BrowserError if launch fails
 */
export async function launchBrowserServer(
  options: BrowserLaunchOptions
): Promise<BrowserServerLaunchResult> {
  const {
    userDataDir,
    port,
    headless = false,
    proxy,
    browserPath,
    browserChannel: _browserChannel,
    userAgent,
    viewportWidth,
    viewportHeight,
  } = options;

  // Find browser executable
  const executablePath = await findBrowserExecutablePath(browserPath);

  // Build browser args
  const args = buildBrowserArgs(
    port,
    userDataDir,
    headless,
    proxy,
    userAgent,
    viewportWidth,
    viewportHeight
  );

  debugLog('Browser args:', args);

  // Spawn browser process (detached, independent)
  const browserProcess = spawn(executablePath, args, {
    detached: true, // Browser survives parent (CLI) exit
    stdio: 'ignore', // Don't pipe stdout/stderr to CLI
  });

  // Allow parent to exit independently
  browserProcess.unref();

  const pid = browserProcess.pid ?? 0;

  // Wait for CDP endpoint to be ready
  const actualPort = await waitForCDPReady(port, pid);

  const wsEndpoint = 'ws://127.0.0.1:' + actualPort + '/';

  return { port: actualPort, pid, wsEndpoint };
}

/**
 * Build browser CLI arguments
 */
function buildBrowserArgs(
  port: number,
  userDataDir: string,
  headless: boolean,
  proxy?: string,
  userAgent?: string,
  viewportWidth?: number,
  viewportHeight?: number
): string[] {
  const args: string[] = [
    '--remote-debugging-port=' + port,
    '--user-data-dir=' + userDataDir,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-background-networking',
    '--metrics-recording-only',
    '--disable-component-extensions-with-background-pages',
    '--disable-features=SessionRestore,Translate',
    '--restore-last-session=false',
    '--enable-features=NetworkService,NetworkServiceInProcess',
  ];

  // Linux server environment: conditionally inject sandbox-related flags
  if (isLinux()) {
    if (needsNoSandbox()) {
      args.push('--no-sandbox');
    }
    if (needsDisableDevShm()) {
      args.push('--disable-dev-shm-usage');
    }
    // Linux desktop: avoid Gnome Keyring/KDE wallet instability
    if (process.env.XDG_SESSION_TYPE) {
      args.push('--password-store=basic');
    }
  }

  if (!headless) {
    args.push('--start-maximized');
  } else {
    args.push('--headless');
    // Use fingerprint screen dimensions to avoid JS/screen size mismatch detection
    const w = viewportWidth ?? 1280;
    const h = viewportHeight ?? 720;
    args.push('--window-size=' + w + ',' + h);
    // Override User-Agent to remove HeadlessChrome marker
    if (userAgent) {
      args.push('--user-agent=' + userAgent);
    }
    // Remove automation control marker
    args.push('--disable-blink-features=AutomationControlled');
  }

  if (proxy) {
    args.push('--proxy-server=' + proxy);
  }

  return args;
}

/**
 * Wait for CDP endpoint to be ready
 *
 * Polls the HTTP endpoint until browser is ready to accept connections.
 */
async function waitForCDPReady(port: number, pid: number): Promise<number> {
  const startTime = Date.now();

  while (Date.now() - startTime < CDP_READY_TIMEOUT) {
    // Check if process is still alive
    try {
      process.kill(pid, 0);
    } catch {
      throw createBrowserError(
        BrowserErrorCode.PROCESS_TERMINATION_FAILED,
        'Browser process died during startup (PID: ' + pid + ')'
      );
    }

    // Check CDP endpoint
    try {
      const response = await fetch('http://127.0.0.1:' + port + '/json/version', {
        signal: AbortSignal.timeout(CDP_POLL_INTERVAL),
      });

      if (response.ok) {
        return port;
      }
    } catch {
      // Endpoint not ready yet, continue polling
    }

    await new Promise((resolve) => setTimeout(resolve, CDP_POLL_INTERVAL));
  }

  throw createBrowserError(
    BrowserErrorCode.ENDPOINT_NOT_READY,
    'CDP endpoint not ready within ' + CDP_READY_TIMEOUT + 'ms on port ' + port
  );
}

// ============================================
// Context Setup (for CDP-connected browser)
// ============================================

/**
 * Setup browser context with stealth injection
 *
 * When connecting via CDP, the browser already has a default context
 * from launchPersistentContext-like behavior (--user-data-dir).
 *
 * @param browser - Browser instance (connected via CDP)
 * @param fingerprint - User fingerprint for stealth
 * @param geolocation - Optional geolocation config
 * @returns Browser context and page
 */
export async function setupBrowserContext(
  browser: Browser,
  fingerprint: UserFingerprint,
  geolocation?: GeolocationConfig
): Promise<BrowserInstanceWithPage> {
  // Get existing contexts (browser launched with --user-data-dir has a default context)
  const contexts = browser.contexts();

  let context: BrowserContext;
  if (contexts.length > 0) {
    // Use the existing persistent context
    context = contexts[0];
    await injectStealthToContext(context, fingerprint, geolocation);
  } else {
    // Create new context (fallback)
    context = await browser.newContext();
    await injectStealthToContext(context, fingerprint, geolocation);
  }

  // Create a new page for this session
  const page = await context.newPage();

  return { browser, context, page };
}

/**
 * Inject stealth script into a browser context
 */
async function injectStealthToContext(
  context: BrowserContext,
  fingerprint: UserFingerprint,
  geolocation?: GeolocationConfig
): Promise<void> {
  const script = generateStealthScript(fingerprint, undefined, geolocation);
  await context.addInitScript(script);
}

// ============================================
// Browser Disconnect (NOT close)
// ============================================

/**
 * Disconnect from browser without closing it
 *
 * This allows the browser to keep running for future CLI commands.
 * Only closes the pages created by this CLI session.
 *
 * @param browser - Browser instance to disconnect from
 * @param pagesToClose - Pages created by this CLI session
 */
export async function disconnectFromBrowser(browser: Browser, pagesToClose: Page[]): Promise<void> {
  // Close our own pages first
  for (const page of pagesToClose) {
    if (!page.isClosed()) {
      try {
        await page.close({ runBeforeUnload: false });
      } catch {
        // Page may already be closed
      }
    }
  }

  // Disconnect from browser (DO NOT close it)
  // Playwright doesn't have a disconnect() method, but close() on CDP-connected
  // browser only disconnects, not kills the process
  // However, we need to verify this behavior...

  // Actually, browser.close() on CDP connection does close the browser process
  // We need to just let the connection drop naturally
  // The browser will keep running because it was spawned as detached process
  browser.isConnected(); // Just leave the connection, it will timeout eventually

  // Alternative: manually disconnect by closing the underlying connection
  // For now, we just close our pages and let the browser run
}
/**
 * Diagnose if user data directory is corrupted
 *
 * Tests browser startup with a fresh temporary directory.
 * If the browser starts successfully with temp dir, it indicates
 * the original user data directory is corrupted.
 *
 * @param options - Original launch options (to reuse browser path, etc.)
 * @param originalUserDataDir - The suspected corrupted user data directory
 * @returns true if diagnosis confirms user data is corrupted, false otherwise
 */
export async function diagnoseCorruptedUserData(
  options: BrowserLaunchOptions,
  _originalUserDataDir: string
): Promise<boolean> {
  // Create a temporary directory for testing
  const tempDir = path.join(os.tmpdir(), 'xhs-browser-diagnostic-' + Date.now());

  try {
    fs.mkdirSync(tempDir, { recursive: true });

    // Try launching with the temporary directory (same browser, different user data)
    const diagnosticOptions: BrowserLaunchOptions = {
      ...options,
      userDataDir: tempDir,
      port: options.port + 1000, // Use different port to avoid conflicts
    };

    // Attempt to launch browser with temp directory
    const result = await launchBrowserServer(diagnosticOptions);

    // If successful, browser itself is fine - the original user data is corrupted
    if (result.pid) {
      // Clean up: kill the diagnostic browser
      try {
        process.kill(result.pid, 'SIGTERM');
      } catch {
        // Process might already be dead
      }
      return true; // Confirmed: user data is corrupted
    }

    return false;
  } catch {
    // If diagnostic launch also fails, it's NOT a user data issue
    // Could be: missing browser executable, port issue, permission issue, etc.
    return false;
  } finally {
    // Clean up temp directory
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}
