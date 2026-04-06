/**
 * CDP Browser Connector
 *
 * @module browser/cdp/connector
 * @description Connects to existing Chromium browser via CDP
 */

import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { DEFAULT_CDP_CONNECT_TIMEOUT } from './constants';

// ============================================
// CDP Connection
// ============================================

/**
 * Connect to an existing browser via CDP
 *
 * @param port - CDP debugging port
 * @param timeout - Connection timeout in milliseconds
 * @returns Browser instance or null if connection failed
 */
export async function connectCDPBrowser(
  port: number,
  timeout: number = DEFAULT_CDP_CONNECT_TIMEOUT
): Promise<Browser | null> {
  const endpointURL = `http://127.0.0.1:${port}`;

  try {
    const browser = await chromium.connectOverCDP(endpointURL, {
      timeout,
    });

    // Verify connection is valid
    if (!browser.isConnected()) {
      await browser.close().catch(() => {});
      return null;
    }

    return browser;
  } catch {
    // Connection failed - return null instead of throwing
    return null;
  }
}

/**
 * Check if a CDP endpoint is reachable
 *
 * @param port - CDP port to check
 * @param timeout - Request timeout in milliseconds
 * @returns True if endpoint is reachable
 */
export async function checkCDPConnection(port: number, timeout: number = 5000): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}
