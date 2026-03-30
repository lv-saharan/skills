/**
 * Cookie storage operations
 *
 * @module cookie/storage
 * @description Load, save, and delete cookies with multi-user support
 *
 * @deprecated This module is deprecated. Please use the Profile API from '../user' instead.
 *   - Use loadUserProfile() to load complete user profile (includes cookies, fingerprint)
 *   - Use hasProfile() to check if profile exists
 *   - This module will be removed in a future version
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import type { BrowserContext } from 'playwright';
import type { CookieEntry, CookieStorage } from './types';
import type { UserName } from '../user';
import { hasProfile, loadUserProfile } from '../user';
import { debugLog } from '../utils/helpers';

/** Track if deprecation warning has been shown */
const deprecationWarningsShown = new Set<string>();

// ============================================
// Constants
// ============================================

/** Cookie file name */
const COOKIE_FILE = 'cookies.json';

// ============================================
// Path Helpers
// ============================================

/**
 * Get users directory path
 */
function getUsersDir(): string {
  return path.resolve(process.cwd(), 'users');
}

/**
 * Get absolute path to cookie file for a specific user
 * @param user - User name (optional, uses 'default' if not specified)
 */
export function getCookiePath(user?: UserName): string {
  const userName = user || 'default';
  return path.resolve(getUsersDir(), userName, COOKIE_FILE);
}

/**
 * Check if cookie file exists for a user
 * @param user - User name (optional)
 */
export function cookieExists(user?: UserName): boolean {
  return existsSync(getCookiePath(user));
}

// ============================================
// Storage Operations
// ============================================

/**
 * Show deprecation warning (once per unique caller)
 */
function showDeprecationWarning(functionName: string, user?: UserName): void {
  const key = `${functionName}:${user || 'default'}`;
  if (!deprecationWarningsShown.has(key)) {
    console.warn(
      `[DEPRECATED] ${functionName}() is deprecated. ` +
        `Please use loadUserProfile() from '../user' instead. ` +
        `This function will be removed in a future version.`
    );
    deprecationWarningsShown.add(key);
  }
}

/**
 * Load cookies from storage for a specific user
 *
 * @deprecated Use loadUserProfile() from '../user' instead for new code.
 *   This function now uses the Profile API internally when available.
 * @param user - User name (optional)
 */
export async function loadCookies(user?: UserName): Promise<CookieEntry[]> {
  const userName = user || 'default';

  // Show deprecation warning
  showDeprecationWarning('loadCookies', userName);

  // Try to use Profile API if available
  try {
    if (hasProfile(userName)) {
      const profile = await loadUserProfile(userName);
      debugLog(`Loaded cookies via Profile API for user: ${userName}`);
      // Profile stores cookies at user root level
      const cookiePath = getCookiePath(userName);
      if (existsSync(cookiePath)) {
        const content = await readFile(cookiePath, 'utf-8');
        const storage: CookieStorage = JSON.parse(content);
        return storage.cookies;
      }
      // If profile exists but no cookies.json, return empty
      debugLog(`Profile exists but no cookies.json for user: ${userName}`);
      return [];
    }
  } catch (profileError) {
    // Fall back to legacy behavior if Profile API fails
    debugLog('Profile API unavailable, falling back to legacy cookie loading:', profileError);
  }

  // Legacy behavior: load directly from cookies.json
  const cookiePath = getCookiePath(userName);

  if (!existsSync(cookiePath)) {
    debugLog(`Cookie file does not exist for user: ${userName}`);
    return [];
  }

  try {
    const content = await readFile(cookiePath, 'utf-8');
    const storage: CookieStorage = JSON.parse(content);

    debugLog(`Loaded ${storage.cookies.length} cookies for user: ${userName}`);
    return storage.cookies;
  } catch (error) {
    debugLog('Failed to load cookies:', error);
    return [];
  }
}

/**
 * Save cookies to storage for a specific user
 * @param cookies - Cookie array to save
 * @param user - User name (optional)
 */
export async function saveCookies(cookies: CookieEntry[], user?: UserName): Promise<void> {
  const cookiePath = getCookiePath(user);
  const cookieDir = path.dirname(cookiePath);

  // Ensure user directory exists
  if (!existsSync(cookieDir)) {
    mkdirSync(cookieDir, { recursive: true });
  }

  const storage: CookieStorage = {
    cookies,
    savedAt: new Date().toISOString(),
  };

  await writeFile(cookiePath, JSON.stringify(storage, null, 2), 'utf-8');
  debugLog(`Saved ${cookies.length} cookies to ${cookiePath}`);
}

/**
 * Delete cookie file for a user
 * @param user - User name (optional)
 */
export async function deleteCookies(user?: UserName): Promise<void> {
  const cookiePath = getCookiePath(user);

  if (existsSync(cookiePath)) {
    const { unlink } = await import('fs/promises');
    await unlink(cookiePath);
    debugLog('Deleted cookie file');
  }
}

/**
 * Extract cookies from browser context
 */
export async function extractCookies(context: BrowserContext): Promise<CookieEntry[]> {
  const cookies = await context.cookies();
  debugLog(`Extracted ${cookies.length} cookies from context`);
  return cookies as CookieEntry[];
}

/**
 * Load and validate cookies in one step
 *
 * @param user - User name (optional)
 * @returns Validated cookie array
 * @throws Error if cookies are invalid
 */
export async function loadAndValidateCookies(user?: UserName): Promise<CookieEntry[]> {
  const { validateCookies } = await import('./validation');
  const cookies = await loadCookies(user);
  validateCookies(cookies);
  return cookies;
}

/**
 * Add cookies to browser context for a specific user
 *
 * @param context - Playwright browser context
 * @param user - User name (optional)
 */
export async function addCookiesToContext(context: BrowserContext, user?: UserName): Promise<void> {
  const cookies = await loadAndValidateCookies(user);
  await context.addCookies(cookies);
  debugLog(`Added ${cookies.length} cookies to context for user: ${user || 'default'}`);
}
