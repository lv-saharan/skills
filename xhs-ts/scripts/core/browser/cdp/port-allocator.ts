/**
 * CDP Port Allocator
 *
 * @module browser/cdp/port-allocator
 * @description Allocates and manages CDP ports for browser instances
 *
 * ## Architecture (v3)
 *
 * This module no longer maintains in-memory state. Instead, it uses
 * `profile.json` as the single source of truth for port allocations.
 *
 * Benefits:
 * - CLI restart does not lose port state
 * - Multiple CLI instances share the same state
 * - Automatic cleanup of dead browser instances
 *
 * Port allocation strategy:
 * 1. Check if user already has a port in profile.json
 * 2. Verify if that port's CDP endpoint is still alive
 * 3. If alive, reuse the port; if dead, clean up and allocate new
 * 4. New allocation: deterministic port based on user hash, with fallback
 */

import { createServer } from 'net';
import { CDP_PORT_RANGE_START, CDP_PORT_RANGE_END, type PortAllocationResult } from './types';
import { loadConnectionInfo, clearConnectionInfo } from '../../../user/storage-v3';
import type { UserName } from '../../../user/types';
import { debugLog } from '../../../core/utils';

// ============================================
// Port Availability Checks
// ============================================

/**
 * Check if a port is available for binding
 *
 * @param port - Port number to check
 * @returns True if port is available
 */
export async function checkPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();

    server.once('error', () => {
      resolve(false);
    });

    server.once('listening', () => {
      server.close();
      resolve(true);
    });

    server.listen(port, '127.0.0.1');
  });
}

/**
 * Check if a CDP endpoint is ready and responding
 *
 * @param port - CDP port
 * @param timeout - Timeout in milliseconds
 * @returns True if CDP endpoint is responding
 */
export async function checkCDPReady(port: number, timeout = 5000): Promise<boolean> {
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

// ============================================
// Port Allocation (profile.json as source of truth)
// ============================================

/**
 * Allocate a CDP port for a user
 *
 * Uses profile.json as the single source of truth:
 * 1. Check if user has existing connection in profile.json
 * 2. Verify CDP endpoint is still alive
 * 3. Reuse or allocate new port
 *
 * @param user - User name
 * @returns Port allocation result
 */
export async function allocatePort(user: UserName): Promise<PortAllocationResult> {
  // 1. Check for existing connection in profile.json
  const existingConnection = await loadConnectionInfo(user);

  if (existingConnection?.cdpPort) {
    const port = existingConnection.cdpPort;

    // 2. Check if CDP endpoint is still alive
    const isCDPReady = await checkCDPReady(port);
    if (isCDPReady) {
      debugLog(`Reusing existing CDP port ${port} for user: ${user}`);
      return { success: true, port };
    }

    // 3. Browser is dead, clean up connection info
    debugLog(`CDP port ${port} for user ${user} is no longer alive, cleaning up`);
    await clearConnectionInfo(user);
  }

  // 4. Allocate new port
  // Use deterministic port based on user hash for consistency
  const preferredPort = calculatePreferredPort(user);

  // Try preferred port first
  const preferredAvailable = await checkPortAvailable(preferredPort);
  if (preferredAvailable) {
    debugLog(`Allocated preferred port ${preferredPort} for user: ${user}`);
    return { success: true, port: preferredPort };
  }

  // Preferred port is occupied, find next available
  for (let port = CDP_PORT_RANGE_START; port <= CDP_PORT_RANGE_END; port++) {
    if (port === preferredPort) {
      continue;
    } // Already checked

    const available = await checkPortAvailable(port);
    if (available) {
      debugLog(`Allocated fallback port ${port} for user: ${user}`);
      return { success: true, port };
    }
  }

  return {
    success: false,
    error: `No available CDP port in range ${CDP_PORT_RANGE_START}-${CDP_PORT_RANGE_END}`,
  };
}

/**
 * Release port allocation for a user
 *
 * Clears the connection info from profile.json.
 * This should be called when the browser is explicitly closed.
 *
 * @param user - User name
 */
export async function releasePortForUser(user: UserName): Promise<void> {
  await clearConnectionInfo(user);
  debugLog(`Released port allocation for user: ${user}`);
}

/**
 * Get current port for a user
 *
 * Reads from profile.json. Returns undefined if no connection exists.
 *
 * @param user - User name
 * @returns Port number or undefined
 */
export async function getPortForUser(user: UserName): Promise<number | undefined> {
  const connection = await loadConnectionInfo(user);
  return connection?.cdpPort;
}

// ============================================
// Helpers
// ============================================

/**
 * Calculate preferred port for a user
 *
 * Uses deterministic hash so the same user always gets the same preferred port.
 * This improves reconnection success rate.
 *
 * @param user - User name
 * @returns Preferred port number
 */
function calculatePreferredPort(user: string): number {
  const hash = hashString(user);
  return CDP_PORT_RANGE_START + (hash % (CDP_PORT_RANGE_END - CDP_PORT_RANGE_START + 1));
}

/**
 * Simple string hash function
 *
 * Produces a consistent hash for a given string.
 *
 * @param str - String to hash
 * @returns Hash value
 */
function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}
