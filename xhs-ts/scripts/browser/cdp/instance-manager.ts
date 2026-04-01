/**
 * Browser Instance Manager
 *
 * @module browser/cdp/instance-manager
 * @description Manages CDP browser instances with lifecycle, reconnection, and main page tracking
 */

import type { Browser, Page } from 'playwright';
import type { UserName } from '../../user/types';
import {
  type ManagedBrowserInstance,
  type BrowserInstanceConfig,
  type CDPConnectionMeta,
  type MainPageInfo,
  type InstanceManagerState,
  DEFAULT_IDLE_TIMEOUT,
} from './types';
import { launchCDPBrowser, launchCDPBrowserWithUserData } from './launcher';
import { connectCDPBrowser, checkCDPConnection } from './connector';
import { releasePortForUser } from './port-allocator';
import { createStealthPage } from './stealth';
import {
  saveBrowserConnection,
  loadBrowserConnection,
  clearBrowserConnection,
  updateLastActivity,
  hasProfile,
  getUserDataDir,
} from '../../user/storage';
import { getUserFingerprint } from '../../user/fingerprint';
import { debugLog } from '../../utils/helpers';

// ============================================
// Global Instance Manager
// ============================================

/**
 * Browser Instance Manager
 *
 * Singleton class that manages CDP browser instances across the application.
 * Handles:
 * - Instance creation and reuse
 * - Reconnection to existing instances
 * - Main page tracking
 * - Health monitoring integration
 */
class BrowserInstanceManager {
  /** Managed instances by instance ID */
  private instances = new Map<string, ManagedBrowserInstance>();

  /** User to instance mapping */
  private userToInstance = new Map<UserName, string>();

  /** Main pages by user */
  private mainPages = new Map<UserName, MainPageInfo>();

  /** Instance counter for generating IDs */
  private instanceCounter = 0;

  // ============================================
  // Instance Lifecycle
  // ============================================

  /**
   * Get or create a browser instance for a user
   *
   * This is the main entry point for obtaining a browser instance.
   * It will:
   * 1. Return existing instance if valid
   * 2. Try to reconnect to saved instance
   * 3. Create new instance if needed
   *
   * @param user - User name
   * @param config - Browser configuration
   * @returns Managed browser instance
   */
  async getOrCreateInstance(
    user: UserName,
    config: Partial<BrowserInstanceConfig> = {}
  ): Promise<ManagedBrowserInstance> {
    // Check for existing instance in memory
    const existingId = this.userToInstance.get(user);
    if (existingId) {
      const instance = this.instances.get(existingId);
      if (instance && instance.browser.isConnected()) {
        instance.activity.lastActivity = new Date();
        instance.activity.isActive = true;
        return instance;
      }
      // Instance is dead, clean up
      await this.cleanupInstance(existingId);
    }

    // Try to reconnect to saved instance
    const reconnected = await this.tryReconnect(user, config);
    if (reconnected) {
      return reconnected;
    }

    // Create new instance
    return await this.createNewInstance(user, config);
  }

  /**
   * Try to reconnect to a previously saved instance
   *
   * @param user - User name
   * @param config - Browser configuration
   * @returns Instance if reconnected, null otherwise
   */
  private async tryReconnect(
    user: UserName,
    config: Partial<BrowserInstanceConfig>
  ): Promise<ManagedBrowserInstance | null> {
    const savedConnection = await loadBrowserConnection(user);
    if (!savedConnection?.cdpPort) {
      return null;
    }

    // Check if port is still responding
    const isResponsive = await checkCDPConnection(savedConnection.cdpPort);
    if (!isResponsive) {
      await clearBrowserConnection(user);
      await releasePortForUser(user);
      return null;
    }

    // Try to connect
    const browser = await connectCDPBrowser(savedConnection.cdpPort);
    if (!browser) {
      await clearBrowserConnection(user);
      await releasePortForUser(user);
      return null;
    }

    // Build instance from reconnected browser
    const instance = this.buildInstance(
      user,
      browser,
      {
        port: savedConnection.cdpPort,
        endpointUrl: `http://127.0.0.1:${savedConnection.cdpPort}`,
        wsEndpoint: savedConnection.wsEndpoint,
        connectedAt: savedConnection.startedAt ?? new Date().toISOString(),
        lastActivityAt: new Date().toISOString(),
      },
      config
    );

    debugLog(`Reconnected to browser for user: ${user}`, { port: savedConnection.cdpPort });
    return instance;
  }

  /**
   * Create a new browser instance
   *
   * @param user - User name
   * @param config - Browser configuration
   * @returns Managed browser instance
   */
  private async createNewInstance(
    user: UserName,
    config: Partial<BrowserInstanceConfig>
  ): Promise<ManagedBrowserInstance> {
    const fullConfig: BrowserInstanceConfig = {
      user,
      headless: config.headless ?? false,
      idleTimeout: config.idleTimeout ?? DEFAULT_IDLE_TIMEOUT,
      ...config,
    };

    // Check if profile exists to use persistent context
    const hasUserProfile = hasProfile(user);
    const userDataDir = getUserDataDir(user);

    let browser: Browser;
    let cdp: CDPConnectionMeta;

    if (hasUserProfile) {
      // Use persistent context with user data directory (preserves cookies)
      const result = await launchCDPBrowserWithUserData(fullConfig, userDataDir);
      browser = result.browser;
      cdp = result.cdp;
      debugLog(`Created new browser instance with persistent context for user: ${user}`);
    } else {
      // No profile - create stateless browser (will not have login state)
      const result = await launchCDPBrowser(fullConfig);
      browser = result.browser;
      cdp = result.cdp;
      debugLog(`Created new stateless browser instance for user: ${user} (no profile)`);
    }

    // Build instance
    const instance = this.buildInstance(user, browser, cdp, fullConfig);

    // Save connection info
    await saveBrowserConnection(user, {
      cdpPort: cdp.port,
      pid: cdp.pid,
      wsEndpoint: cdp.wsEndpoint,
      startedAt: cdp.connectedAt,
      lastActivityAt: cdp.lastActivityAt,
    });

    debugLog(`Created new browser instance for user: ${user}`, { port: cdp.port });
    return instance;
  }

  /**
   * Build a managed instance from browser and CDP metadata
   */
  private buildInstance(
    user: UserName,
    browser: Browser,
    cdp: CDPConnectionMeta,
    config: Partial<BrowserInstanceConfig>
  ): ManagedBrowserInstance {
    const id = this.generateInstanceId();
    const now = new Date();

    const instance: ManagedBrowserInstance = {
      id,
      user,
      browser,
      cdp,
      config: {
        user,
        ...config,
      },
      activity: {
        lastActivity: now,
        isActive: true,
      },
      createdAt: now,
    };

    this.instances.set(id, instance);
    this.userToInstance.set(user, id);

    return instance;
  }

  // ============================================
  // Main Page Management
  // ============================================

  /**
   * Get or create main page for a user
   *
   * The main page is kept open after login and serves as the session page.
   * It should NOT be closed during normal command execution.
   *
   * @param user - User name
   * @param config - Browser configuration
   * @returns Main page
   */
  async getOrCreateMainPage(
    user: UserName,
    config: Partial<BrowserInstanceConfig> = {}
  ): Promise<Page> {
    // Check for existing main page
    const existingMainPage = this.mainPages.get(user);
    if (existingMainPage && !existingMainPage.page.isClosed()) {
      existingMainPage.inUse = true;
      return existingMainPage.page;
    }

    // Get or create instance
    const instance = await this.getOrCreateInstance(user, config);

    // Get fingerprint for stealth
    const fingerprint = await getUserFingerprint(user);

    // Create main page with stealth
    const mainPage = await createStealthPage(instance.browser, fingerprint);

    // Track main page
    this.mainPages.set(user, {
      user,
      page: mainPage,
      createdAt: new Date(),
      inUse: true,
    });

    debugLog(`Created main page for user: ${user}`);
    return mainPage;
  }

  /**
   * Get existing main page (without creating)
   *
   * @param user - User name
   * @returns Main page or undefined
   */
  getMainPage(user: UserName): Page | undefined {
    const mainPageInfo = this.mainPages.get(user);
    if (mainPageInfo && !mainPageInfo.page.isClosed()) {
      return mainPageInfo.page;
    }
    return undefined;
  }

  /**
   * Release main page (mark as not in use)
   *
   * @param user - User name
   */
  releaseMainPage(user: UserName): void {
    const mainPageInfo = this.mainPages.get(user);
    if (mainPageInfo) {
      mainPageInfo.inUse = false;
    }
  }

  // ============================================
  // Instance Operations
  // ============================================

  /**
   * Get active instance for a user
   *
   * @param user - User name
   * @returns Managed instance or undefined
   */
  getActiveInstance(user: UserName): ManagedBrowserInstance | undefined {
    const instanceId = this.userToInstance.get(user);
    if (!instanceId) {
      return undefined;
    }
    return this.instances.get(instanceId);
  }

  /**
   * Close instance for a user
   *
   * @param user - User name
   */
  async closeInstance(user: UserName): Promise<void> {
    const instanceId = this.userToInstance.get(user);
    if (instanceId) {
      await this.cleanupInstance(instanceId);
    }
  }

  /**
   * Release instance reference without closing the browser
   *
   * This is used when we want to keep the browser running but
   * allow the CLI process to exit.
   *
   * @param user - User name
   */
  releaseInstanceReference(user: UserName): void {
    const instanceId = this.userToInstance.get(user);
    if (instanceId) {
      // Remove tracking but don't close browser
      this.instances.delete(instanceId);
      this.userToInstance.delete(user);
    }

    // Remove main page reference
    this.mainPages.delete(user);

    debugLog(`Released instance reference for user: ${user} (browser keeps running)`);
  }

  /**
   * List all active instances
   *
   * @returns Array of managed instances
   */
  listInstances(): ManagedBrowserInstance[] {
    return Array.from(this.instances.values());
  }

  /**
   * Update activity timestamp for an instance
   *
   * @param user - User name
   */
  async updateActivity(user: UserName): Promise<void> {
    const instance = this.getActiveInstance(user);
    if (instance) {
      instance.activity.lastActivity = new Date();
      instance.activity.isActive = true;
      await updateLastActivity(user);
    }
  }

  /**
   * Get instance manager state
   *
   * @returns Current state snapshot
   */
  getState(): InstanceManagerState {
    const instancesByUser: InstanceManagerState['instancesByUser'] = {};
    const mainPagesByUser: InstanceManagerState['mainPagesByUser'] = {};

    for (const [user, instanceId] of this.userToInstance) {
      const instance = this.instances.get(instanceId);
      if (instance) {
        instancesByUser[user] = {
          instanceId,
          cdpPort: instance.cdp.port,
          createdAt: instance.createdAt.toISOString(),
          lastActivity: instance.activity.lastActivity.toISOString(),
        };
      }
    }

    for (const [user, mainPageInfo] of this.mainPages) {
      mainPagesByUser[user] = {
        createdAt: mainPageInfo.createdAt.toISOString(),
        currentUrl: mainPageInfo.currentUrl,
      };
    }

    return {
      totalInstances: this.instances.size,
      instancesByUser,
      mainPagesByUser,
    };
  }

  // ============================================
  // Cleanup
  // ============================================

  /**
   * Cleanup a specific instance
   *
   * @param instanceId - Instance ID to cleanup
   */
  private async cleanupInstance(instanceId: string): Promise<void> {
    const instance = this.instances.get(instanceId);
    if (!instance) {
      return;
    }

    const user = instance.user;

    // Close main page if exists
    const mainPageInfo = this.mainPages.get(user);
    if (mainPageInfo) {
      try {
        if (!mainPageInfo.page.isClosed()) {
          await mainPageInfo.page.close();
        }
      } catch {
        // Ignore close errors
      }
      this.mainPages.delete(user);
    }

    // Close browser
    try {
      if (instance.browser.isConnected()) {
        await instance.browser.close();
      }
    } catch {
      // Ignore close errors
    }

    // Cleanup tracking
    this.instances.delete(instanceId);
    this.userToInstance.delete(user);

    // Release port
    await releasePortForUser(user);

    // Clear saved connection
    await clearBrowserConnection(user);

    debugLog(`Cleaned up instance for user: ${user}`);
  }

  /**
   * Cleanup all instances
   */
  async cleanupAll(): Promise<void> {
    const instanceIds = Array.from(this.instances.keys());
    for (const instanceId of instanceIds) {
      await this.cleanupInstance(instanceId);
    }
  }

  // ============================================
  // Helpers
  // ============================================

  /**
   * Generate unique instance ID
   */
  private generateInstanceId(): string {
    return `instance_${Date.now()}_${++this.instanceCounter}`;
  }
}

// ============================================
// Singleton Export
// ============================================

/** Global browser instance manager */
export const browserInstanceManager = new BrowserInstanceManager();
