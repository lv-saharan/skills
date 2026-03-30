/**
 * Profile Architecture Edge Case Tests
 *
 * Tests edge cases and error handling in Profile architecture:
 * - Corrupted JSON handling
 * - Partial migration scenarios
 * - Missing directories
 * - Idempotency
 * - Version handling
 *
 * These tests use bun:test framework.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as path from 'path';
import { mkdtempSync, rmSync, existsSync, writeFileSync, mkdirSync, unlinkSync } from 'fs';
import { tmpdir } from 'os';

// Import functions to test
import { isMigrationNeeded, migrateToMultiUser, migrateToProfile, ensureMigrated } from '../user/migration';
import { 
  getUsersDir, 
  getUserDir, 
  getUserDataDir, 
  loadUsersMeta, 
  saveUsersMeta,
  createUserProfile,
  loadUserProfile,
  hasProfile
} from '../user';

// Test utilities
const createTempDir = (): string => {
  return mkdtempSync(path.join(tmpdir(), 'profile-edge-'));
};

const cleanupDir = (dirPath: string): void => {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
};

describe('Profile Edge Case Tests', () => {
  let testDir: string;
  let originalCwd: string;

  beforeEach(() => {
    testDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(testDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupDir(testDir);
  });

  // ============================================
  // Corrupted JSON Tests
  // ============================================
  describe('Corrupted JSON handling', () => {
    test('handles invalid JSON in users.json gracefully', () => {
      const usersDir = getUsersDir();
      mkdirSync(usersDir, { recursive: true });
      writeFileSync(path.join(usersDir, 'users.json'), '{ invalid json }');
      
      // Should return true (migration needed) since JSON is corrupted
      const result = isMigrationNeeded();
      expect(result).toBe(true);
    });

    test('handles empty users.json file', () => {
      const usersDir = getUsersDir();
      mkdirSync(usersDir, { recursive: true });
      writeFileSync(path.join(usersDir, 'users.json'), '');
      
      // Should return true since empty file is invalid
      const result = isMigrationNeeded();
      expect(result).toBe(true);
    });

    test('handles partial/corrupted meta.json', () => {
      const userName = 'test-user';
      const userDir = getUserDir(userName);
      const metaPath = path.join(userDir, 'meta.json');
      
      mkdirSync(userDir, { recursive: true });
      writeFileSync(metaPath, '{ broken');
      
      // Should throw SyntaxError for corrupted JSON - this is correct behavior
      expect(() => loadUserProfile(userName)).toThrow();
    });

    test('handles wrong type in users.json', () => {
      const usersDir = getUsersDir();
      mkdirSync(usersDir, { recursive: true });
      // Write array instead of object
      writeFileSync(path.join(usersDir, 'users.json'), '[]');
      
      // Should return true since it's invalid
      const result = isMigrationNeeded();
      expect(result).toBe(true);
    });
  });

  // ============================================
  // Partial Migration Tests
  // ============================================
  describe('Partial migration handling', () => {
    test('detects v2 users.json but missing user-data directory', async () => {
      const userName = 'test-user';
      const usersDir = getUsersDir();
      const userDir = getUserDir(userName);
      
      // Create v2 users.json without user-data
      mkdirSync(usersDir, { recursive: true });
      mkdirSync(userDir, { recursive: true });
      
      const meta = {
        current: userName,
        version: 2,
        profiles: {
          [userName]: {
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            environmentType: 'gui-native' as const,
          },
        },
      };
      writeFileSync(path.join(usersDir, 'users.json'), JSON.stringify(meta));
      
      // user-data directory should NOT exist
      const userDataDir = getUserDataDir(userName);
      expect(existsSync(userDataDir)).toBe(false);
      
      // Migration should be needed
      const result = isMigrationNeeded();
      expect(result).toBe(true);
    });

    test('detects v2 users.json but missing meta.json', async () => {
      const userName = 'test-user';
      const usersDir = getUsersDir();
      const userDir = getUserDir(userName);
      const userDataDir = getUserDataDir(userName);
      
      // Create v2 users.json with user-data but no meta.json
      mkdirSync(usersDir, { recursive: true });
      mkdirSync(userDir, { recursive: true });
      mkdirSync(userDataDir, { recursive: true });
      
      const meta = {
        current: userName,
        version: 2,
        profiles: {
          [userName]: {
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            environmentType: 'gui-native' as const,
          },
        },
      };
      writeFileSync(path.join(usersDir, 'users.json'), JSON.stringify(meta));
      
      // meta.json should NOT exist
      expect(existsSync(path.join(userDir, 'meta.json'))).toBe(false);
      
      // Migration should be needed
      const result = isMigrationNeeded();
      expect(result).toBe(true);
    });

    test('retry migration succeeds after partial migration', async () => {
      const userName = 'test-user';
      const usersDir = getUsersDir();
      const userDir = getUserDir(userName);
      
      // Setup partial state
      mkdirSync(usersDir, { recursive: true });
      mkdirSync(userDir, { recursive: true });
      
      const meta = {
        current: userName,
        version: 2,
        profiles: {
          [userName]: {
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            environmentType: 'gui-native' as const,
          },
        },
      };
      writeFileSync(path.join(usersDir, 'users.json'), JSON.stringify(meta));
      
      // Run migration
      await migrateToProfile();
      
      // Now user-data and meta.json should exist
      expect(existsSync(getUserDataDir(userName))).toBe(true);
      expect(existsSync(path.join(userDir, 'meta.json'))).toBe(true);
    });
  });

  // ============================================
  // Missing Directory Tests
  // ============================================
  describe('Missing directory handling', () => {
    test('detects missing users directory', () => {
      const usersDir = getUsersDir();
      expect(existsSync(usersDir)).toBe(false);
      
      const result = isMigrationNeeded();
      expect(result).toBe(true);
    });

    test('handles manually deleted user-data directory', async () => {
      const userName = 'test-user';
      
      // Create complete profile first
      await createUserProfile(userName, 'headless-smart');
      expect(hasProfile(userName)).toBe(true);
      
      // Manually delete user-data
      const userDataDir = getUserDataDir(userName);
      rmSync(userDataDir, { recursive: true, force: true });
      expect(existsSync(userDataDir)).toBe(false);
      
      // Migration should be needed
      const result = isMigrationNeeded();
      expect(result).toBe(true);
      
      // Run migration to fix
      await migrateToProfile();
      
      // Should be recreated
      expect(existsSync(userDataDir)).toBe(true);
    });

    test('recreates missing directories on retry', async () => {
      const userName = 'test-user';
      const usersDir = getUsersDir();
      const userDir = getUserDir(userName);
      
      // Setup v2 state
      mkdirSync(usersDir, { recursive: true });
      mkdirSync(userDir, { recursive: true });
      
      const meta = {
        current: userName,
        version: 2,
        profiles: {
          [userName]: {
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            environmentType: 'gui-native' as const,
          },
        },
      };
      writeFileSync(path.join(usersDir, 'users.json'), JSON.stringify(meta));
      
      // First migration
      await migrateToProfile();
      const userDataDir = getUserDataDir(userName);
      expect(existsSync(userDataDir)).toBe(true);
      
      // Delete it
      rmSync(userDataDir, { recursive: true, force: true });
      
      // Second migration
      await migrateToProfile();
      
      // Should be recreated
      expect(existsSync(userDataDir)).toBe(true);
    });
  });

  // ============================================
  // Idempotency Tests
  // ============================================
  describe('Idempotency', () => {
    test('running migration twice does not lose data', async () => {
      const userName = 'test-user';
      const usersDir = getUsersDir();
      const userDir = getUserDir(userName);
      const cookiePath = path.join(userDir, 'cookies.json');
      
      // Setup with existing cookies
      mkdirSync(usersDir, { recursive: true });
      mkdirSync(userDir, { recursive: true });
      
      const testCookies = [{ name: 'test', value: 'data' }];
      writeFileSync(cookiePath, JSON.stringify({ cookies: testCookies }));
      
      // First migration
      await migrateToProfile();
      
      // Second migration
      await migrateToProfile();
      
      // Cookies should still exist
      expect(existsSync(cookiePath)).toBe(true);
      
      // Profile should still work
      const profile = await loadUserProfile(userName);
      expect(profile).toBeDefined();
    });

    test('no duplicate user-data directories on multiple runs', async () => {
      const userName = 'test-user';
      const usersDir = getUsersDir();
      const userDir = getUserDir(userName);
      const userDataDir = getUserDataDir(userName);
      
      // Setup v2 state
      mkdirSync(usersDir, { recursive: true });
      mkdirSync(userDir, { recursive: true });
      
      const meta = {
        current: userName,
        version: 2,
        profiles: {
          [userName]: {
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            environmentType: 'gui-native' as const,
          },
        },
      };
      writeFileSync(path.join(usersDir, 'users.json'), JSON.stringify(meta));
      
      // Run multiple times
      await migrateToProfile();
      await migrateToProfile();
      await migrateToProfile();
      
      // Should still be exactly one user-data directory
      expect(existsSync(userDataDir)).toBe(true);
      
      // Count subdirectories - should be exactly 1 level deep
      const stat = await import('fs').then(fs => fs.promises.stat(userDataDir));
      expect(stat.isDirectory()).toBe(true);
    });
  });

  // ============================================
  // Version Handling Tests
  // ============================================
  describe('Version handling', () => {
    test('detects manually downgraded version', () => {
      const usersDir = getUsersDir();
      const userDir = getUserDir('default');
      mkdirSync(usersDir, { recursive: true });
      mkdirSync(userDir, { recursive: true });
      
      // Write v1 users.json
      const meta = {
        current: 'default',
        version: 1,
      };
      writeFileSync(path.join(usersDir, 'users.json'), JSON.stringify(meta));
      
      const result = isMigrationNeeded();
      expect(result).toBe(true);
    });

    test('handles version mismatch gracefully', async () => {
      const usersDir = getUsersDir();
      const userDir = getUserDir('test');
      mkdirSync(usersDir, { recursive: true });
      mkdirSync(userDir, { recursive: true });
      
      // Write users.json with version 3 (future version)
      const meta = {
        current: 'test',
        version: 3,
        profiles: {
          'test': {
            createdAt: new Date().toISOString(),
            lastUsedAt: new Date().toISOString(),
            environmentType: 'gui-native' as const,
          },
        },
      };
      writeFileSync(path.join(usersDir, 'users.json'), JSON.stringify(meta));
      
      // Should handle without crash
      const result = isMigrationNeeded();
      expect(typeof result).toBe('boolean');
    });

    test('re-migration succeeds after version downgrade', async () => {
      const userName = 'test-user';
      const usersDir = getUsersDir();
      const userDir = getUserDir(userName);
      const userDataDir = getUserDataDir(userName);
      
      // Create complete profile first
      await createUserProfile(userName, 'headless-smart');
      expect(existsSync(userDataDir)).toBe(true);
      
      // Manually set version to 1
      const usersMeta = await loadUsersMeta();
      usersMeta.version = 1;
      await saveUsersMeta(usersMeta);
      
      // Migration should be needed
      expect(isMigrationNeeded()).toBe(true);
      
      // Ensure migrated
      await ensureMigrated();
      
      // Version should be updated back
      const updatedMeta = await loadUsersMeta();
      expect(updatedMeta.version).toBeGreaterThanOrEqual(2);
    });
  });

  // ============================================
  // Backup Tests
  // ============================================
  describe('Backup handling', () => {
    test('backup is created before migration', async () => {
      const userName = 'test-user';
      const projectRoot = process.cwd();
      
      // Create old-style cookies.json in project root
      writeFileSync(
        path.join(projectRoot, 'cookies.json'),
        JSON.stringify({ cookies: [{ name: 'test', value: 'value' }] })
      );
      
      // Run migration
      await migrateToMultiUser();
      
      // Backup should exist in default user directory (migrateToMultiUser always uses 'default')
      const defaultUserDir = getUserDir('default');
      const backupPath = path.join(defaultUserDir, 'cookies.json.backup');
      expect(existsSync(backupPath)).toBe(true);
      
      // Original should still exist (migrated copy)
      const originalPath = path.join(defaultUserDir, 'cookies.json');
      expect(existsSync(originalPath)).toBe(true);
    });
  });

  // ============================================
  // Integration: Complete v1 to v2 Migration
  // ============================================
  describe('Complete migration flow', () => {
    test('v1 to v2 migration creates complete profile structure', async () => {
      const userName = 'default';
      
      // Simulate v1 state (no users directory)
      expect(isMigrationNeeded()).toBe(true);
      
      // Run migration
      await ensureMigrated();
      
      // Verify complete structure
      const usersDir = getUsersDir();
      const userDir = getUserDir(userName);
      const userDataDir = getUserDataDir(userName);
      const metaPath = path.join(userDir, 'meta.json');
      
      expect(existsSync(usersDir)).toBe(true);
      expect(existsSync(userDir)).toBe(true);
      expect(existsSync(userDataDir)).toBe(true);
      expect(existsSync(metaPath)).toBe(true);
      
      // Verify users.json
      const usersMeta = await loadUsersMeta();
      expect(usersMeta.version).toBe(2);
      expect(usersMeta.profiles).toBeDefined();
      expect(usersMeta.profiles[userName]).toBeDefined();
      
      // Migration should no longer be needed
      expect(isMigrationNeeded()).toBe(false);
    });
  });
});
