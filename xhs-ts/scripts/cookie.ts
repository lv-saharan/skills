/**
 * Cookie management for Xiaohongshu sessions
 *
 * @module cookie
 * @description Load, save, and validate cookies for persistent sessions
 */

import { readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import type { CookieEntry, CookieStorage } from './types';
import { XhsError as XhsErrorClass, XhsErrorCode } from './types';
import { debugLog } from './utils/helpers';

// ============================================
// Constants
// ============================================

/** Cookie file path (relative to project root) */
const COOKIE_FILE = 'cookies.json';

/** Key cookies required for authentication */
const REQUIRED_COOKIES = ['a1', 'web_session'] as const;

// ============================================
// Cookie Storage
// ============================================

/**
 * Get absolute path to cookie file
 */
export function getCookiePath(): string {
  // Cookie file is at project root level
  return path.resolve(process.cwd(), COOKIE_FILE);
}

/**
 * Check if cookie file exists
 */
export function cookieExists(): boolean {
  return existsSync(getCookiePath());
}

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

// ============================================
// Cookie Validation
// ============================================

/**
 * Check if required cookies are present
 */
export function hasRequiredCookies(cookies: CookieEntry[]): boolean {
  const cookieNames = new Set(cookies.map((c) => c.name));

  return REQUIRED_COOKIES.every((name) => cookieNames.has(name));
}

/**
 * Get specific cookie by name
 */
export function getCookie(cookies: CookieEntry[], name: string): CookieEntry | undefined {
  return cookies.find((c) => c.name === name);
}

/**
 * Validate cookies and throw error if invalid
 */
export function validateCookies(cookies: CookieEntry[]): void | never {
  if (!cookies.length) {
    throw new XhsErrorClass('No cookies found. Please login first.', XhsErrorCode.NOT_LOGGED_IN);
  }

  if (!hasRequiredCookies(cookies)) {
    throw new XhsErrorClass(
      'Required cookies missing. Please login again.',
      XhsErrorCode.COOKIE_EXPIRED
    );
  }
}

// ============================================
// Cookie Extraction
// ============================================

/**
 * Extract cookies from browser context
 */
export async function extractCookies(context: {
  cookies: () => Promise<CookieEntry[]>;
}): Promise<CookieEntry[]> {
  const cookies = await context.cookies();

  // Filter to xiaohongshu.com cookies only
  return cookies.filter((c) => c.domain.includes('xiaohongshu.com'));
}

/**
 * Format cookies for display (mask sensitive values)
 */
export function formatCookiesForDisplay(cookies: CookieEntry[]): string[] {
  return cookies.map((c) => {
    const valueLength = c.value.length;
    const maskedValue = c.value.slice(0, 8) + '...'.padEnd(valueLength - 8, '*');
    return `${c.name}: ${maskedValue}`;
  });
}
