/**
 * Cookie storage operations
 *
 * @module cookie/storage
 * @description Load, save, and delete cookies with multi-user support
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import type { BrowserContext } from 'playwright';
import type { CookieEntry, CookieStorage } from './types';
import type { UserName } from '../user';
import { debugLog } from '../utils/helpers';

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
 * Load cookies from storage for a specific user
 * @param user - User name (optional)
 */
export async function loadCookies(user?: UserName): Promise<CookieEntry[]> {
  const cookiePath = getCookiePath(user);

  if (!existsSync(cookiePath)) {
    debugLog(`Cookie file does not exist for user: ${user || 'default'}`);
    return [];
  }

  try {
    const content = await readFile(cookiePath, 'utf-8');
    const storage: CookieStorage = JSON.parse(content);

    debugLog(`Loaded ${storage.cookies.length} cookies for user: ${user || 'default'}`);
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
