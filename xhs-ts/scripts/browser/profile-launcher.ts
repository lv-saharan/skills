/**
 * Profile-based CDP browser launcher
 *
 * @module browser/profile-launcher
 * @description Unified CDP browser launcher with stealth behavior configuration
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { UserName, EnvironmentType } from '../user/types';
import type { StealthModuleConfig, GeolocationConfig } from './stealth/types';
import { injectStealthToContext } from './cdp/stealth';
import { connectCDPBrowser, checkCDPConnection } from './cdp/connector';
import { spawnCDPBrowserDetached } from './cdp/launcher';
import {
  loadConnectionInfo,
  saveConnectionInfo,
  clearConnectionInfo,
  updateProfileLastUsed,
} from '../user/storage-v3';
import { getUserDataDir, hasProfile, createUserProfile } from '../user/storage';
import { loadUserProfile } from '../user/profile-loader';
import { allocatePort, releasePortForUser } from './cdp/port-allocator';
import { config } from '../config';
import { debugLog, delay, waitForCondition } from '../utils/helpers';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface StealthBehaviorConfig {
  minActionDelay: number;
  maxActionDelay: number;
  minReadTime: number;
  maxReadTime: number;
  viewportRandomization: boolean;
  humanMouseMovement: boolean;
  stealthConfig: StealthModuleConfig;
  geolocation?: GeolocationConfig;
}

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

export interface ProfileBrowserResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
  user: UserName;
  environmentType: EnvironmentType;
  behavior: StealthBehaviorConfig;
  cdpPort: number;
  isNewInstance: boolean;
}

const GUI_NATIVE_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 500,
  maxActionDelay: 1500,
  minReadTime: 1000,
  maxReadTime: 3000,
  viewportRandomization: false,
  humanMouseMovement: true,
  stealthConfig: {
    navigator: true,
    screen: true,
    webgl: true,
    canvas: true,
    audio: true,
    chrome: true,
    webrtc: true,
    media: true,
    timezone: true,
    font: true,
    battery: true,
    geolocation: true,
    performance: true,
  },
};

const HEADLESS_SMART_BEHAVIOR: StealthBehaviorConfig = {
  minActionDelay: 1500,
  maxActionDelay: 3500,
  minReadTime: 2000,
  maxReadTime: 5000,
  viewportRandomization: true,
  humanMouseMovement: false,
  stealthConfig: GUI_NATIVE_BEHAVIOR.stealthConfig,
};

export function getStealthBehavior(environmentType: EnvironmentType): StealthBehaviorConfig {
  if (environmentType === 'gui-native') {
    return GUI_NATIVE_BEHAVIOR;
  }
  return HEADLESS_SMART_BEHAVIOR;
}

export async function randomStealthDelay(
  behavior: StealthBehaviorConfig,
  actionType: 'action' | 'read' = 'action'
): Promise<void> {
  const { min, max } =
    actionType === 'read'
      ? { min: behavior.minReadTime, max: behavior.maxReadTime }
      : { min: behavior.minActionDelay, max: behavior.maxActionDelay };
  const delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
  await delay(delayMs);
}

function resolveUser(explicitUser?: UserName): UserName {
  return explicitUser || 'default';
}

async function tryConnectExistingCDP(
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

async function spawnNewCDPBrowser(
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
      await browser.close();
      debugLog('Closed CDP browser via API for user: ' + user);
    }
  } catch {
    debugLog('CDP close failed for user: ' + user);
  }

  await delay(1000);
  const stillAlive = await checkCDPConnection(cdpPort);
  if (stillAlive && pid) {
    debugLog('Browser still alive, force killing PID ' + pid);
    await forceKillProcess(pid);
  }

  await clearConnectionInfo(user);
  await releasePortForUser(user);
  debugLog('CDP instance closed for user: ' + user);
}

export async function hasCDPInstance(user: UserName): Promise<boolean> {
  const connection = await loadConnectionInfo(user);
  if (!connection?.cdpPort) {
    return false;
  }
  return checkCDPConnection(connection.cdpPort);
}

export async function getCDPPort(user: UserName): Promise<number | undefined> {
  const connection = await loadConnectionInfo(user);
  return connection?.cdpPort;
}

export async function launchProfileBrowser(
  options: ProfileLaunchOptions = {}
): Promise<ProfileBrowserResult> {
  const { user: explicitUser, headless = config.headless, autoCreate = false } = options;
  const user = resolveUser(explicitUser);
  debugLog('Launching CDP browser for user: ' + user);

  if (!hasProfile(user)) {
    if (autoCreate) {
      debugLog('Profile does not exist, creating for user: ' + user);
      const { detectEnvironmentType } = await import('../user/environment');
      const envType = detectEnvironmentType();
      await createUserProfile(user, envType);
    } else {
      throw new Error('Profile does not exist for user: ' + user + '. Use autoCreate: true.');
    }
  }

  const profile = await loadUserProfile(user);
  const environmentType = profile.meta.environmentType as EnvironmentType;
  const behavior = getStealthBehavior(environmentType);
  debugLog('Profile loaded for ' + user, {
    environmentType,
    hasFingerprint: !!profile.fingerprint,
  });

  let browser: Browser;
  let cdpPort: number;
  let isNewInstance: boolean;

  const existing = await tryConnectExistingCDP(user, headless);
  if (existing) {
    browser = existing.browser;
    cdpPort = existing.port;
    isNewInstance = false;
  } else {
    const spawned = await spawnNewCDPBrowser(user, options);
    browser = spawned.browser;
    cdpPort = spawned.port;
    isNewInstance = true;
  }

  const contexts = browser.contexts();
  let context: BrowserContext;
  if (contexts.length > 0) {
    context = contexts[0];
    await injectStealthToContext(context, profile.fingerprint);
  } else {
    context = await browser.newContext();
    await injectStealthToContext(context, profile.fingerprint);
  }

  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();
  await updateProfileLastUsed(user);

  return { browser, context, page, user, environmentType, behavior, cdpPort, isNewInstance };
}

export async function withProfile<T>(
  user: UserName,
  callback: (page: Page, result: Omit<ProfileBrowserResult, 'page'>) => Promise<T>,
  options: Omit<ProfileLaunchOptions, 'user'> = {}
): Promise<T> {
  const { keepAlive = true } = options;
  const result = await launchProfileBrowser({ ...options, user });
  try {
    return await callback(result.page, {
      browser: result.browser,
      context: result.context,
      user: result.user,
      environmentType: result.environmentType,
      behavior: result.behavior,
      cdpPort: result.cdpPort,
      isNewInstance: result.isNewInstance,
    });
  } finally {
    if (keepAlive) {
      // Disconnect from browser but keep it running
      await result.browser.close();
      debugLog('Disconnected from CDP browser (keeping alive) for user: ' + result.user);
    } else {
      // Fully close the browser instance
      await closeCDPInstance(result.user);
      debugLog('Closed CDP instance for user: ' + result.user);
    }
  }
}
