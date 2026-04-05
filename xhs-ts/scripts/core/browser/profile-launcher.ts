/**
 * Profile-based CDP browser launcher
 *
 * @module browser/profile-launcher
 * @description Orchestrates CDP browser lifecycle: load profile → connect/spawn → inject stealth → return result
 */

import type { Browser, BrowserContext, Page } from 'playwright';
import type { UserName, EnvironmentType } from '../../user/types';
import { injectStealthToContext } from './cdp/stealth';
import { hasProfile, createUserProfile } from '../../user/storage';
import { loadUserProfile } from '../../user/profile-loader';
import { updateProfileLastUsed } from '../../user/storage-v3';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { debugLog } from '../../core/utils';
import type { StealthBehaviorConfig } from './stealth-behavior';
import type { ProfileLaunchOptions } from './cdp-spawner';
import { getStealthBehavior } from './stealth-behavior';
import { tryConnectExistingCDP, closeCDPInstance } from './cdp-connection';
import { spawnNewCDPBrowser } from './cdp-spawner';

export type { StealthBehaviorConfig } from './stealth-behavior';
export type { ProfileLaunchOptions } from './cdp-spawner';
export { closeCDPInstance, hasCDPInstance, getCDPPort } from './cdp-connection';

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

/**
 * Random delay based on stealth behavior configuration
 */
export async function randomStealthDelay(
  behavior: StealthBehaviorConfig,
  actionType: 'action' | 'read' = 'action'
): Promise<void> {
  const { min, max } =
    actionType === 'read'
      ? { min: behavior.minReadTime, max: behavior.maxReadTime }
      : { min: behavior.minActionDelay, max: behavior.maxActionDelay };
  const delayMs = Math.floor(Math.random() * (max - min + 1)) + min;
  await new Promise((r) => setTimeout(r, delayMs));
}

/**
 * Launch a browser instance for a user profile
 *
 * Lifecycle:
 * 1. Resolve user → load profile → get behavior config
 * 2. Try reconnecting to existing CDP instance
 * 3. If no existing instance, spawn new one
 * 4. Inject stealth script into context (always, even on reuse)
 * 5. Create fresh page and return result
 */
export async function launchProfileBrowser(
  options: ProfileLaunchOptions = {}
): Promise<ProfileBrowserResult> {
  const { user: explicitUser, headless = config.headless, autoCreate = false } = options;
  const user = resolveUser(explicitUser);

  if (!hasProfile(user)) {
    if (autoCreate) {
      debugLog('Profile does not exist, creating for user: ' + user);
      const { detectEnvironmentType } = await import('../../user/environment');
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

    // Inject stealth script (idempotent - addInitScript runs on every new page)
    // FIX: Previously commented out, causing fingerprint leak on reused contexts
    await injectStealthToContext(context, profile.fingerprint);

    // Clean up extra pages: keep only 1 page to avoid accumulation
    // Chrome's default context requires at least 1 page to stay open
    const existingPages = context.pages();
    if (existingPages.length > 1) {
      debugLog(`Closing ${existingPages.length - 1} extra page(s), keeping 1`);
      for (let i = 1; i < existingPages.length; i++) {
        try {
          await existingPages[i].close({ runBeforeUnload: false });
        } catch {
          // Page may be already closed
        }
      }
    }

    debugLog(`Reused context with ${context.pages().length} page(s)`);
  } else {
    context = await browser.newContext();
    await injectStealthToContext(context, profile.fingerprint);
  }

  // Always create a fresh page to ensure stealth script is applied
  const page = await context.newPage();
  await updateProfileLastUsed(user);

  return { browser, context, page, user, environmentType, behavior, cdpPort, isNewInstance };
}

/**
 * High-level API: acquire browser, run callback, manage lifecycle
 *
 * @param user - User name
 * @param callback - Async function receiving page and profile result
 * @param options - Launch options (headless, keepAlive, etc.)
 * @returns Callback result
 */
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
