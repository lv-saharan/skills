/**
 * Port utilities
 *
 * @module browser/port-utils
 * @description CDP port allocation and availability checking (platform-agnostic)
 */

import { createServer } from 'net';

// ============================================
// Constants
// ============================================

/** CDP port range start (after openclaw's 18800-18899) */
export const CDP_PORT_RANGE_START = 18900;

/** CDP port range end */
export const CDP_PORT_RANGE_END = 18999;

// ============================================
// Port Availability Check
// ============================================

/**
 * Check if a port is available
 */
export async function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.listen(port, '127.0.0.1', () => {
      server.close(() => resolve(true));
    });
    server.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Check if CDP endpoint is ready
 */
export async function checkCDPReady(port: number, timeout = 5000): Promise<boolean> {
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

/**
 * Calculate preferred port for identifier (hash-based)
 */
export function calculatePreferredPort(identifier: string): number {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  return CDP_PORT_RANGE_START + (Math.abs(hash) % (CDP_PORT_RANGE_END - CDP_PORT_RANGE_START + 1));
}

/**
 * Allocate first available port in range
 */
export async function allocateAvailablePort(preferredPort: number): Promise<number> {
  const preferredAvailable = await checkPortAvailable(preferredPort);
  if (preferredAvailable) {
    return preferredPort;
  }

  for (let port = CDP_PORT_RANGE_START; port <= CDP_PORT_RANGE_END; port++) {
    if (port === preferredPort) {
      continue;
    }
    const available = await checkPortAvailable(port);
    if (available) {
      return port;
    }
  }

  throw new Error(
    'No available CDP port in range ' + CDP_PORT_RANGE_START + '-' + CDP_PORT_RANGE_END
  );
}

/**
 * Allocate port for identifier (preferred + fallback)
 */
export async function allocatePortForIdentifier(identifier: string): Promise<number> {
  const preferredPort = calculatePreferredPort(identifier);
  return allocateAvailablePort(preferredPort);
}
