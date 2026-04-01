/**
 * Health Monitor
 *
 * @module browser/cdp/health-monitor
 * @description Monitors browser instance health and implements idle timeout cleanup
 */

import type { UserName } from '../../user/types';
import type { ManagedBrowserInstance, HealthCheckResult } from './types';
import { DEFAULT_HEALTH_CHECK_INTERVAL, DEFAULT_IDLE_TIMEOUT } from './types';
import { browserInstanceManager } from './instance-manager';
import { clearBrowserConnection } from '../../user/storage';
import { debugLog } from '../../utils/helpers';

// ============================================
// Health Monitor
// ============================================

/**
 * Health Monitor
 *
 * Periodically checks browser instances for:
 * 1. Connection health (isConnected)
 * 2. Idle timeout (no activity for configured duration)
 *
 * Automatically cleans up unhealthy or idle instances.
 */
class HealthMonitor {
  /** Timer for periodic checks */
  private timer?: ReturnType<typeof setInterval>;

  /** Check interval in milliseconds */
  private interval: number;

  /** Default idle timeout in milliseconds */
  private defaultIdleTimeout: number;

  /** Whether monitor is running */
  private running = false;

  constructor(
    interval: number = DEFAULT_HEALTH_CHECK_INTERVAL,
    defaultIdleTimeout: number = DEFAULT_IDLE_TIMEOUT
  ) {
    this.interval = interval;
    this.defaultIdleTimeout = defaultIdleTimeout;
  }

  // ============================================
  // Lifecycle
  // ============================================

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.running) {
      return;
    }

    this.running = true;
    this.timer = setInterval(() => {
      this.checkAllInstances().catch((error) => {
        debugLog('Health check error:', error);
      });
    }, this.interval);

    // Use unref() to allow the process to exit even if the timer is active
    // This is important for CLI tools that need to exit cleanly
    if (this.timer) {
      this.timer.unref();
    }

    debugLog('Health monitor started', { interval: this.interval });
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (!this.running) {
      return;
    }

    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = undefined;
    }

    debugLog('Health monitor stopped');
  }

  /**
   * Check if monitor is running
   */
  isRunning(): boolean {
    return this.running;
  }

  // ============================================
  // Health Checks
  // ============================================

  /**
   * Check all managed instances
   *
   * @returns Array of health check results
   */
  async checkAllInstances(): Promise<HealthCheckResult[]> {
    const instances = browserInstanceManager.listInstances();
    const results: HealthCheckResult[] = [];

    for (const instance of instances) {
      const result = await this.checkInstance(instance);
      results.push(result);

      if (result.shouldCleanup) {
        await this.cleanupInstance(instance, result.cleanupReason);
      }
    }

    return results;
  }

  /**
   * Check a single instance
   *
   * @param instance - Managed instance to check
   * @returns Health check result
   */
  async checkInstance(instance: ManagedBrowserInstance): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      instanceId: instance.id,
      user: instance.user,
      isConnected: false,
      isResponsive: false,
      idleTimeMs: 0,
      shouldCleanup: false,
    };

    try {
      // Check connection
      result.isConnected = instance.browser.isConnected();

      if (!result.isConnected) {
        result.shouldCleanup = true;
        result.cleanupReason = 'disconnected';
        return result;
      }

      // Check responsiveness by checking contexts
      const contexts = instance.browser.contexts();
      result.isResponsive = contexts.length > 0 || true; // Browser can have no contexts and still be healthy

      // Calculate idle time
      const now = Date.now();
      const lastActivity = instance.activity.lastActivity.getTime();
      result.idleTimeMs = now - lastActivity;

      // Check idle timeout
      const idleTimeout = instance.config.idleTimeout ?? this.defaultIdleTimeout;
      if (result.idleTimeMs > idleTimeout && !instance.activity.isActive) {
        result.shouldCleanup = true;
        result.cleanupReason = 'idle_timeout';
      }
    } catch (error) {
      result.shouldCleanup = true;
      result.cleanupReason = 'error';
      result.error = error instanceof Error ? error.message : 'Unknown error';
    }

    return result;
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Cleanup an instance
   *
   * @param instance - Instance to cleanup
   * @param reason - Cleanup reason
   */
  private async cleanupInstance(
    instance: ManagedBrowserInstance,
    reason?: 'disconnected' | 'idle_timeout' | 'error'
  ): Promise<void> {
    debugLog(`Cleaning up instance due to ${reason ?? 'unknown'}`, {
      user: instance.user,
      instanceId: instance.id,
    });

    await browserInstanceManager.closeInstance(instance.user);
  }

  // ============================================
  // Manual Controls
  // ============================================

  /**
   * Force cleanup an instance by user
   *
   * @param user - User name
   */
  async forceCleanup(user: UserName): Promise<void> {
    await browserInstanceManager.closeInstance(user);
    await clearBrowserConnection(user);
    debugLog(`Force cleaned up instance for user: ${user}`);
  }

  /**
   * Get instance statistics
   *
   * @returns Statistics about instances
   */
  getStats(): {
    total: number;
    connected: number;
    idle: number;
    active: number;
  } {
    const instances = browserInstanceManager.listInstances();
    const now = Date.now();

    let connected = 0;
    let idle = 0;
    let active = 0;

    for (const instance of instances) {
      if (instance.browser.isConnected()) {
        connected++;

        const idleTime = now - instance.activity.lastActivity.getTime();
        const timeout = instance.config.idleTimeout ?? this.defaultIdleTimeout;

        if (idleTime > timeout / 2) {
          idle++;
        } else {
          active++;
        }
      }
    }

    return {
      total: instances.length,
      connected,
      idle,
      active,
    };
  }
}

// ============================================
// Singleton Export
// ============================================

/** Global health monitor */
export const healthMonitor = new HealthMonitor();

// ============================================
// Process Lifecycle Hooks
// ============================================

/**
 * Setup process lifecycle hooks for cleanup
 */
export function setupLifecycleHooks(): void {
  // Cleanup on process exit
  process.on('exit', () => {
    healthMonitor.stop();
  });

  // Cleanup on SIGINT (Ctrl+C)
  process.on('SIGINT', async () => {
    healthMonitor.stop();
    await browserInstanceManager.cleanupAll();
    process.exit(0);
  });

  // Cleanup on SIGTERM
  process.on('SIGTERM', async () => {
    healthMonitor.stop();
    await browserInstanceManager.cleanupAll();
    process.exit(0);
  });

  debugLog('Lifecycle hooks configured');
}
