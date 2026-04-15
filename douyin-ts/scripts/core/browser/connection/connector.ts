/**
 * Browser Connector
 *
 * @module browser/connection/connector
 * @description Connects to browser instances via Playwright BrowserServer or CDP
 */

import { chromium } from 'playwright';
import type { Browser } from 'playwright';
import { DEFAULT_CONNECT_TIMEOUT } from './constants';

// ============================================
// BrowserServer Connection (WebSocket)
// ============================================

/**
 * Connect to a Playwright BrowserServer via WebSocket
 *
 * This is the preferred method for connecting to browsers launched via
 * chromium.launchServer(). Uses Playwright's internal protocol which is
 * more reliable than raw CDP.
 *
 * @param wsEndpoint - WebSocket endpoint URL from browserServer.wsEndpoint()
 * @param timeout - Connection timeout in milliseconds
 * @returns Browser instance or null if connection failed
 */
export async function connectToServer(
  wsEndpoint: string,
  timeout: number = DEFAULT_CONNECT_TIMEOUT
): Promise<Browser | null> {
  try {
    const browser = await chromium.connect(wsEndpoint, { timeout });

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

// ============================================
// CDP Connection (for Persistent Context)
// ============================================

/**
 * Connect to a browser via Chrome DevTools Protocol (CDP)
 *
 * Used for reconnecting to browsers launched with launchPersistentContext + CDP port.
 * The endpoint should be the HTTP endpoint like 'http://localhost:9222'.
 *
 * @param endpoint - CDP HTTP endpoint (e.g., 'http://localhost:9222')
 * @param timeout - Connection timeout in milliseconds
 * @returns Browser instance or null if connection failed
 */
export async function connectOverCDP(
  endpoint: string,
  timeout: number = DEFAULT_CONNECT_TIMEOUT
): Promise<Browser | null> {
  try {
    const browser = await chromium.connectOverCDP(endpoint, { timeout });

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
 * Check if a BrowserServer endpoint is reachable
 *
 * Attempts to connect briefly to verify the endpoint is alive.
 *
 * @param wsEndpoint - WebSocket endpoint URL
 * @param timeout - Connection timeout in milliseconds
 * @returns True if endpoint is reachable
 */
export async function checkServerConnection(
  wsEndpoint: string,
  timeout: number = 5000
): Promise<boolean> {
  try {
    const browser = await chromium.connect(wsEndpoint, { timeout });
    const connected = browser.isConnected();
    await browser.close().catch(() => {});
    return connected;
  } catch {
    return false;
  }
}

/**
 * Check if a CDP endpoint is reachable
 *
 * Uses HTTP endpoint to verify CDP port is available.
 *
 * @param port - CDP port number
 * @param timeout - Connection timeout in milliseconds
 * @returns True if endpoint is reachable
 */
export async function checkCDPConnection(port: number, timeout: number = 5000): Promise<boolean> {
  return checkBrowserEndpointHealth(port, timeout);
}

/**
 * Check if a browser endpoint is reachable via HTTP
 *
 * Used to check if a browser debugging port is available.
 *
 * @param port - Browser debugging port
 * @param timeout - Request timeout in milliseconds
 * @returns True if endpoint is reachable
 */
export async function checkBrowserEndpointHealth(
  port: number,
  timeout: number = 5000
): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch('http://127.0.0.1:' + port + '/json/version', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}
