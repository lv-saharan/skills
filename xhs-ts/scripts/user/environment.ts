/**
 * Environment detection module
 *
 * @module user/environment
 * @description Detect device environment for fingerprint generation and server runtime conditions
 */

import * as fs from 'fs';
import type { EnvironmentType } from './types';

// ============================================
// Display Support Detection
// ============================================

/**
 * Check if the current environment supports a graphical display
 *
 * @returns true if GUI is available, false for headless/server environments
 */
export function hasDisplaySupport(): boolean {
  const platform = process.platform;

  // Linux: check for DISPLAY or WAYLAND_DISPLAY
  if (platform === 'linux') {
    return !!(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
  }

  // Windows and macOS typically have display support
  return true;
}

// ============================================
// Environment Type Detection
// ============================================

/**
 * Detect the environment type
 *
 * @returns Environment type based on display support and other factors
 */
export function detectEnvironmentType(): EnvironmentType {
  if (hasDisplaySupport()) {
    return 'gui-native';
  }

  // No display - use headless-smart by default
  return 'headless-smart';
}

// ============================================
// Server Runtime Detection (Linux / Docker / Root)
// ============================================

/**
 * Check if running on Linux
 */
export function isLinux(): boolean {
  return process.platform === 'linux';
}

/**
 * Check if running as root user (Linux only)
 */
export function isRootUser(): boolean {
  return isLinux() && process.getuid?.() === 0;
}

/**
 * Detect if running inside a container (Docker, Kubernetes, etc.)
 *
 * Checks multiple indicators:
 * - /.dockerenv file (Docker marker)
 * - KUBERNETES_SERVICE_HOST env var (K8s)
 * - /proc/1/cgroup contains 'docker' or 'kubepods'
 */
export function isContainerEnvironment(): boolean {
  if (!isLinux()) {
    return false;
  }

  // Docker container marker file
  if (fs.existsSync('/.dockerenv')) {
    return true;
  }

  // Kubernetes environment
  if (process.env.KUBERNETES_SERVICE_HOST) {
    return true;
  }

  // cgroup detection (Docker/K8s)
  try {
    const cgroup = fs.readFileSync('/proc/1/cgroup', 'utf8');
    if (cgroup.includes('docker') || cgroup.includes('kubepods')) {
      return true;
    }
  } catch {
    // /proc/1/cgroup may not exist on some systems
  }

  return false;
}

/**
 * Whether Chrome needs --no-sandbox flag
 *
 * Required when Chrome's sandbox cannot function properly:
 * - Running as root (Chrome refuses to start without it)
 * - Inside a container (sandbox conflicts with container isolation)
 * - Linux server without GUI (cloud VMs often disable unprivileged user namespaces,
 *   seccomp restrictions, or lack kernel capabilities for sandbox isolation)
 */
export function needsNoSandbox(): boolean {
  // Root user - Chrome absolutely requires it
  if (isRootUser()) {
    return true;
  }

  // Container environment
  if (isContainerEnvironment()) {
    return true;
  }

  // Linux server without GUI - sandbox often broken on cloud VMs
  // (disabled user namespaces, seccomp restrictions, etc.)
  if (isLinux() && !hasDisplaySupport()) {
    return true;
  }

  return false;
}

/**
 * Whether Chrome needs --disable-dev-shm-usage flag
 *
 * Required when /dev/shm is limited:
 * - Containers (64MB default limit)
 * - Some cloud servers with small tmpfs on /dev/shm
 * - Linux servers without GUI (fallback: assume small if check fails)
 */
export function needsDisableDevShm(): boolean {
  // Container environment - known 64MB limit
  if (isContainerEnvironment()) {
    return true;
  }

  // Linux server without GUI - check /dev/shm size
  if (isLinux() && !hasDisplaySupport()) {
    try {
      const stat = fs.statfsSync('/dev/shm');
      const availableMB = (stat.bsize * stat.bavail) / 1024 / 1024;
      if (availableMB < 256) {
        return true;
      }
    } catch {
      // If we can't check /dev/shm, assume it's small on a server
      return true;
    }
  }

  return false;
}
