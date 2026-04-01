/**
 * CDP Browser Connector
 *
 * @module browser/cdp/connector
 * @description Connects to existing Chromium browser via CDP
 */

import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { DEFAULT_CDP_CONNECT_TIMEOUT, type CDPConnectionMeta } from './types';

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
 * Connect to browser via WebSocket endpoint
 *
 * @param wsEndpoint - WebSocket endpoint URL
 * @param timeout - Connection timeout in milliseconds
 * @returns Browser instance or null if connection failed
 */
export async function connectCDPBrowserViaWS(
  wsEndpoint: string,
  timeout: number = DEFAULT_CDP_CONNECT_TIMEOUT
): Promise<Browser | null> {
  try {
    const browser = await chromium.connectOverCDP({
      endpointURL: wsEndpoint,
      timeout,
    });

    if (!browser.isConnected()) {
      await browser.close().catch(() => {});
      return null;
    }

    return browser;
  } catch {
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

/**
 * Get CDP endpoint info
 *
 * @param port - CDP port
 * @returns CDP endpoint info or null
 */
export async function getCDPEndpointInfo(port: number): Promise<{
  browserVersion: string;
  protocolVersion: string;
  webSocketDebuggerUrl: string;
} | null> {
  try {
    const response = await fetch(`http://127.0.0.1:${port}/json/version`);
    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      Browser?: string;
      'Protocol-Version'?: string;
      webSocketDebuggerUrl?: string;
    };

    return {
      browserVersion: data.Browser || 'Unknown',
      protocolVersion: data['Protocol-Version'] || 'Unknown',
      webSocketDebuggerUrl: data.webSocketDebuggerUrl || '',
    };
  } catch {
    return null;
  }
}

/**
 * Try to connect to an existing browser, or return null
 *
 * This is a convenience function that attempts connection with retries.
 *
 * @param port - CDP port
 * @param retries - Number of retry attempts
 * @param retryDelay - Delay between retries in milliseconds
 * @returns Browser instance or null
 */
export async function tryConnectCDPBrowser(
  port: number,
  retries: number = 3,
  retryDelay: number = 1000
): Promise<Browser | null> {
  for (let attempt = 0; attempt < retries; attempt++) {
    const browser = await connectCDPBrowser(port);
    if (browser) {
      return browser;
    }

    if (attempt < retries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }

  return null;
}

/**
 * Build CDP connection metadata from existing connection
 *
 * @param port - CDP port
 * @returns CDP connection metadata
 */
export async function buildCDPConnectionMeta(port: number): Promise<CDPConnectionMeta | null> {
  const info = await getCDPEndpointInfo(port);
  if (!info) {
    return null;
  }

  const now = new Date().toISOString();

  return {
    port,
    endpointUrl: `http://127.0.0.1:${port}`,
    wsEndpoint: info.webSocketDebuggerUrl,
    connectedAt: now,
    lastActivityAt: now,
  };
}
