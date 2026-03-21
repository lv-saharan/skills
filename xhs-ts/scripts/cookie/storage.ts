/**
 * Cookie storage operations
 *
 * @module cookie/storage
 * @description Load, save, and delete cookies
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { BrowserContext } from 'playwright';
import type { CookieEntry, CookieStorage } from './types';
import { debugLog } from '../utils/helpers';

// ============================================
// Constants
// ============================================

/** Cookie file path (relative to project root) */
const COOKIE_FILE = 'cookies.json';

// ============================================
// Path Helpers
// ============================================

/**
 * Get absolute path to cookie file
 */
export function getCookiePath(): string {
  return path.resolve(process.cwd(), COOKIE_FILE);
}

/**
 * Check if cookie file exists
 */
export function cookieExists(): boolean {
  return existsSync(getCookiePath());
}

// ============================================
// Storage Operations
// ============================================

/**
 * Load cookies from storage
 */
export async function loadCookies(): Promise<CookieEntry[]> {
  const cookiePath = getCookiePath();

  if (!existsSync(cookiePath)) {
    debugLog('Cookie file does not exist');
    return [];
  }

  try {
    const content = await readFile(cookiePath, 'utf-8');
    const storage: CookieStorage = JSON.parse(content);

    debugLog(`Loaded ${storage.cookies.length} cookies`);
    return storage.cookies;
  } catch (error) {
    debugLog('Failed to load cookies:', error);
    return [];
  }
}

/**
 * Save cookies to storage
 */
export async function saveCookies(cookies: CookieEntry[]): Promise<void> {
  const cookiePath = getCookiePath();

  const storage: CookieStorage = {
    cookies,
    savedAt: new Date().toISOString(),
  };

  await writeFile(cookiePath, JSON.stringify(storage, null, 2), 'utf-8');
  debugLog(`Saved ${cookies.length} cookies to ${cookiePath}`);
}

/**
 * Delete cookie file
 */
export async function deleteCookies(): Promise<void> {
  const cookiePath = getCookiePath();

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
 * @returns Validated cookie array
 * @throws Error if cookies are invalid
 */
export async function loadAndValidateCookies(): Promise<CookieEntry[]> {
  const { validateCookies } = await import('./validation');
  const cookies = await loadCookies();
  validateCookies(cookies);
  return cookies;
}

/**
 * Add cookies to browser context
 *
 * @param context - Playwright browser context
 */
export async function addCookiesToContext(context: BrowserContext): Promise<void> {
  const cookies = await loadAndValidateCookies();
  await context.addCookies(cookies);
  debugLog(`Added ${cookies.length} cookies to context`);
}
