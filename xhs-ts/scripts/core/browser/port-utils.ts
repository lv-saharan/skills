/**
 * Port utilities
 *
 * @module browser/port-utils
 * @description Browser port allocation and availability checking
 */

import { createServer } from 'net';

// ============================================
// Constants
// ============================================

/** Browser port range start (after openclaw's 18800-18899) */
export const BROWSER_PORT_RANGE_START = 18900;

/** Browser port range end */
export const BROWSER_PORT_RANGE_END = 18999;

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
 * Calculate preferred port for identifier (hash-based)
 */
export function calculatePreferredPort(identifier: string): number {
  let hash = 0;
  for (let i = 0; i < identifier.length; i++) {
    hash = (hash << 5) - hash + identifier.charCodeAt(i);
    hash |= 0;
  }
  return (
    BROWSER_PORT_RANGE_START +
    (Math.abs(hash) % (BROWSER_PORT_RANGE_END - BROWSER_PORT_RANGE_START + 1))
  );
}

/**
 * Allocate first available port in range
 */
export async function allocateAvailablePort(preferredPort: number): Promise<number> {
  const preferredAvailable = await checkPortAvailable(preferredPort);
  if (preferredAvailable) {
    return preferredPort;
  }

  for (let port = BROWSER_PORT_RANGE_START; port <= BROWSER_PORT_RANGE_END; port++) {
    if (port === preferredPort) {
      continue;
    }
    const available = await checkPortAvailable(port);
    if (available) {
      return port;
    }
  }

  throw new Error(
    'No available browser port in range ' + BROWSER_PORT_RANGE_START + '-' + BROWSER_PORT_RANGE_END
  );
}

/**
 * Allocate port for identifier (preferred + fallback)
 */
export async function allocatePortForIdentifier(identifier: string): Promise<number> {
  const preferredPort = calculatePreferredPort(identifier);
  return allocateAvailablePort(preferredPort);
}
