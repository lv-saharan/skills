/**
 * Browser Executable Finder
 *
 * @module core/browser/launcher/executable-finder
 * @description Find browser executable path from Playwright cache
 */

import * as path from 'path';
import * as fs from 'fs';
import { createBrowserError, BrowserErrorCode } from '../errors';

// ============================================
// Constants
// ============================================

/** Possible browser executable filenames by platform */
const BROWSER_PATHS = {
  win32: ['chrome-win64/chrome.exe', 'chrome-win32/chrome.exe'],
  darwin: ['chrome-mac/Chromium.app/Contents/MacOS/Chromium'],
  linux: ['chrome-linux/chrome'],
} as const;

// ============================================
// Browser Executable Finder
// ============================================

/**
 * Find browser executable path from Playwright cache
 *
 * Searches Playwright's browser cache directories without loading Playwright.
 *
 * @param customPath - Optional custom browser path to check first
 * @returns Browser executable path
 * @throws BrowserError if browser executable not found
 */
export async function findBrowserExecutablePath(customPath?: string): Promise<string> {
  // Check custom path first
  if (customPath && fs.existsSync(customPath)) {
    return customPath;
  }

  // Search Playwright cache directories
  const cacheDirs = getCacheDirectories();

  for (const cacheDir of cacheDirs) {
    if (!fs.existsSync(cacheDir)) {
      continue;
    }

    try {
      const entries = fs.readdirSync(cacheDir, { withFileTypes: true });
      const chromiumDirs = entries
        .filter((e) => e.isDirectory() && e.name.startsWith('chromium'))
        .map((e) => e.name);

      for (const chromiumDir of chromiumDirs) {
        const possiblePaths = BROWSER_PATHS[process.platform as keyof typeof BROWSER_PATHS] || [];

        for (const relativePath of possiblePaths) {
          const exePath = path.join(cacheDir, chromiumDir, relativePath);
          if (fs.existsSync(exePath)) {
            return exePath;
          }
        }
      }
    } catch {
      // Ignore errors, try next directory
    }
  }

  throw createBrowserError(
    BrowserErrorCode.EXECUTABLE_NOT_FOUND,
    customPath
      ? `Custom browser executable not found at: ${customPath}`
      : 'Chromium browser not found. Please install Playwright browsers with: npm run install:browser'
  );
}

/**
 * Get list of cache directories to search
 */
function getCacheDirectories(): string[] {
  const {
    LOCALAPPDATA = '',
    USERPROFILE = '',
    HOME = '',
    XDG_CACHE_HOME = '',
    npm_config_cache = '',
  } = process.env;

  return [
    path.join(LOCALAPPDATA, 'ms-playwright'),
    path.join(USERPROFILE, '.cache', 'ms-playwright'),
    path.join(HOME, '.cache', 'ms-playwright'),
    path.join(XDG_CACHE_HOME || path.join(HOME, '.cache'), 'ms-playwright'),
    path.join(npm_config_cache, 'ms-playwright'),
  ].filter(Boolean);
}
