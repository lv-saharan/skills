/**
 * Profile Architecture Integration Tests
 *
 * Tests the complete Profile lifecycle including:
 * - Profile creation flow
 * - Profile loading flow
 * - Migration behavior
 * - Multi-user isolation
 *
 * These tests use bun:test framework and test the xhs-ts Profile architecture.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import * as fs from 'fs';
import * as path from 'path';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { tmpdir } from 'os';

import {
  createUserProfile,
  loadUserProfile,
  hasProfile,
  getProfileStatus,
  getUserDir,
  getUserDataDir,
  loadUsersMeta,
  saveUsersMeta,
  setCurrentUser,
  getCurrentUser,
  listUsers,
  updateLastUsed,
  userExists,
} from '../user';
import { isMigrationNeeded, migrateToMultiUser } from '../user/migration';

// Test utilities
const createTempDir = (): string => {
  return mkdtempSync(path.join(tmpdir(), 'profile-test-'));
};

const cleanupDir = (dirPath: string): void => {
  if (existsSync(dirPath)) {
    rmSync(dirPath, { recursive: true, force: true });
  }
};

describe('Profile Architecture Integration Tests', () => {
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

  describe('Profile Creation Flow', () => {
    test('creates user profile with correct directory structure', async () => {
      const username = 'test-user';
      const environmentType = 'headless-smart';

      await createUserProfile(username, environmentType, 'Test Preset');

      const userDir = getUserDir(username);
      const userDataDir = getUserDataDir(username);
      const metaPath = path.join(userDir, 'meta.json');

      expect(existsSync(userDir)).toBe(true);
      expect(existsSync(userDataDir)).toBe(true);
      expect(existsSync(metaPath)).toBe(true);
    });

    test('creates profile with correct metadata', async () => {
      const username = 'test-user';
      const environmentType = 'headless-smart';

      await createUserProfile(username, environmentType);

      const profile = await loadUserProfile(username);

      expect(profile.meta.environmentType).toBe(environmentType);
      expect(profile.meta.version).toBe(1);
      expect(profile.meta.createdAt).toBeDefined();
      expect(profile.meta.lastUsedAt).toBeDefined();
      expect(profile.userDataDir).toBe(getUserDataDir(username));
    });

    test('creates profile with fingerprint data', async () => {
      const username = 'test-user';

      await createUserProfile(username, 'headless-smart');

      const profile = await loadUserProfile(username);

      expect(profile.fingerprint).toBeDefined();
      expect(profile.fingerprint.device).toBeDefined();
      expect(profile.fingerprint.browser).toBeDefined();
      expect(profile.fingerprint.screen).toBeDefined();
    });

    test('updates users.json with profile reference', async () => {
      const username = 'test-user';

      await createUserProfile(username, 'headless-smart');

      const meta = loadUsersMeta();

      expect(meta.profiles).toBeDefined();
      expect(meta.profiles![username]).toBeDefined();
      expect(meta.profiles![username].environmentType).toBe('headless-smart');
    });
  });

  describe('Profile Loading Flow', () => {
    test('loads existing profile successfully', async () => {
      const username = 'test-user';
      const environmentType = 'gui-native';

      await createUserProfile(username, environmentType);

      const profile = await loadUserProfile(username);

      expect(profile.meta.environmentType).toBe(environmentType);
      expect(profile.userDataDir).toBe(getUserDataDir(username));
    });

    test('throws error when loading non-existent profile', async () => {
      const username = 'non-existent-user';

      await expect(loadUserProfile(username)).rejects.toThrow(
        'Profile does not exist for user: non-existent-user'
      );
    });

    test('hasProfile returns correct status', async () => {
      const username = 'test-user';

      expect(hasProfile(username)).toBe(false);

      await createUserProfile(username, 'headless-smart');

      expect(hasProfile(username)).toBe(true);
    });

    test('getProfileStatus returns correct status info', async () => {
      const username = 'test-user';

      const statusBefore = getProfileStatus(username);
      expect(statusBefore.status).toBe('none');

      await createUserProfile(username, 'headless-smart');

      const statusAfter = getProfileStatus(username);
      expect(statusAfter.status).toBe('full');
      expect(statusAfter.hasUserDataDir).toBe(true);
    });
  });

  describe('Profile Update Flow', () => {
    test('updateLastUsed updates timestamps in meta.json', async () => {
      const username = 'test-user';

      await createUserProfile(username, 'headless-smart');

      const profileBefore = await loadUserProfile(username);
      const originalTimestamp = profileBefore.meta.lastUsedAt;

      await new Promise((resolve) => setTimeout(resolve, 10));

      await updateLastUsed(username);

      const profileAfter = await loadUserProfile(username);
      expect(profileAfter.meta.lastUsedAt).not.toBe(originalTimestamp);
      expect(new Date(profileAfter.meta.lastUsedAt).getTime()).toBeGreaterThan(
        new Date(originalTimestamp).getTime()
      );
    });

    test('updateLastUsed updates timestamps in users.json', async () => {
      const username = 'test-user';

      await createUserProfile(username, 'headless-smart');

      await updateLastUsed(username);

      const meta = loadUsersMeta();
      expect(meta.profiles![username].lastUsedAt).toBeDefined();
    });
  });

  describe('Multi-User Switching', () => {
    test('creates multiple users with isolated directories', async () => {
      const user1 = 'user-one';
      const user2 = 'user-two';

      await createUserProfile(user1, 'headless-smart');
      await createUserProfile(user2, 'gui-native');

      expect(getUserDir(user1)).not.toBe(getUserDir(user2));
      expect(getUserDataDir(user1)).not.toBe(getUserDataDir(user2));

      const profile1 = await loadUserProfile(user1);
      const profile2 = await loadUserProfile(user2);

      expect(profile1.meta.environmentType).toBe('headless-smart');
      expect(profile2.meta.environmentType).toBe('gui-native');
    });

    test('setCurrentUser switches current user correctly', async () => {
      const user1 = 'user-one';
      const user2 = 'user-two';

      await createUserProfile(user1, 'headless-smart');
      await createUserProfile(user2, 'headless-smart');

      await setCurrentUser(user1);
      expect(getCurrentUser()).toBe(user1);

      await setCurrentUser(user2);
      expect(getCurrentUser()).toBe(user2);
    });

    test('listUsers returns all users with profile status', async () => {
      const user1 = 'user-one';
      const user2 = 'user-two';

      await createUserProfile(user1, 'headless-smart');
      // Create user2 directory manually (without full profile)
      const user2Dir = getUserDir(user2);
      mkdirSync(user2Dir, { recursive: true });

      const result = await listUsers();

      // At least user-one should be listed
      const userNames = result.users.map((u) => u.name);
      expect(userNames).toContain(user1);

      const user1Info = result.users.find((u) => u.name === user1);
      expect(user1Info?.hasProfile).toBe(true);
    });

    test('profiles have isolated user-data directories', async () => {
      const user1 = 'user-one';
      const user2 = 'user-two';

      await createUserProfile(user1, 'headless-smart');
      await createUserProfile(user2, 'headless-smart');

      const userDataDir1 = getUserDataDir(user1);
      const userDataDir2 = getUserDataDir(user2);

      expect(existsSync(userDataDir1)).toBe(true);
      expect(existsSync(userDataDir2)).toBe(true);
      expect(userDataDir1).not.toBe(userDataDir2);
    });
  });

  describe('Migration Flow', () => {
    test('isMigrationNeeded returns true for new installation without users dir', () => {
      // Fresh temp directory - users/ doesn't exist yet
      expect(isMigrationNeeded()).toBe(true);
    });

    test('migrateToMultiUser creates multi-user structure from legacy cookie', async () => {
      // Create legacy cookie file at project root
      const legacyCookiePath = path.join(process.cwd(), 'cookies.json');
      writeFileSync(legacyCookiePath, JSON.stringify({ session: 'test-cookie' }));

      // Run migration
      await migrateToMultiUser();

      // Verify multi-user structure created
      expect(existsSync(path.join(process.cwd(), 'users'))).toBe(true);
      expect(existsSync(path.join(process.cwd(), 'users', 'default'))).toBe(true);
      expect(existsSync(path.join(process.cwd(), 'users', 'default', 'cookies.json'))).toBe(true);

      // Legacy cookie should be moved
      expect(existsSync(legacyCookiePath)).toBe(false);
    });

    test('migrateToMultiUser handles already existing users gracefully', async () => {
      // First create proper structure via createUserProfile
      await createUserProfile('test-user', 'headless-smart');

      // Running migrate again should not throw (it just returns early)
      await migrateToMultiUser(); // Should complete without error
    });
  });

  describe('Post-Migration Behavior', () => {
    test('legacy cookies preserved after migration', async () => {
      const legacyCookiePath = path.join(process.cwd(), 'cookies.json');
      const legacyCookies = { session: 'legacy-cookie-data' };
      writeFileSync(legacyCookiePath, JSON.stringify(legacyCookies));

      await migrateToMultiUser();

      // Cookies should be moved to users/default/
      const newCookiePath = path.join(
        process.cwd(),
        'users',
        'default',
        'cookies.json'
      );
      expect(existsSync(newCookiePath)).toBe(true);

      const cookiesContent = JSON.parse(readFileSync(newCookiePath, 'utf-8'));
      expect(cookiesContent.session).toBe('legacy-cookie-data');
    });

    test('multiple users can coexist after migration', async () => {
      // Create two users
      await createUserProfile('user-one', 'headless-smart');
      await createUserProfile('user-two', 'gui-native');

      // Both should be loadable
      const profile1 = await loadUserProfile('user-one');
      const profile2 = await loadUserProfile('user-two');

      expect(profile1.meta).toBeDefined();
      expect(profile2.meta).toBeDefined();
      expect(profile1.meta.environmentType).toBe('headless-smart');
      expect(profile2.meta.environmentType).toBe('gui-native');
    });
  });

  describe('Edge Cases', () => {
    test('handles invalid username characters', async () => {
      const invalidUsername = 'user/with\\invalid:chars';

      await expect(
        createUserProfile(invalidUsername, 'headless-smart')
      ).rejects.toThrow();
    });

    test('handles reserved Windows usernames', async () => {
      const reservedNames = ['con', 'prn', 'aux', 'nul'];

      for (const name of reservedNames) {
        await expect(createUserProfile(name, 'headless-smart')).rejects.toThrow();
      }
    });

    test('loads profile with missing fingerprint (generates default)', async () => {
      const username = 'test-user';

      // Create profile directory manually with meta but no fingerprint
      const userDir = getUserDir(username);
      mkdirSync(userDir, { recursive: true });
      mkdirSync(getUserDataDir(username), { recursive: true });

      const meta = {
        version: 1,
        createdAt: new Date().toISOString(),
        lastUsedAt: new Date().toISOString(),
        environmentType: 'headless-smart' as const,
        fingerprintSource: 'preset' as const,
      };
      writeFileSync(
        path.join(userDir, 'meta.json'),
        JSON.stringify(meta)
      );

      // Update users.json to include this user
      const metaJson = loadUsersMeta();
      metaJson.profiles = metaJson.profiles || {};
      metaJson.profiles[username] = {
        createdAt: meta.createdAt,
        lastUsedAt: meta.lastUsedAt,
        environmentType: 'headless-smart' as const,
      };
      saveUsersMeta(metaJson);

      // Load should work and generate default fingerprint
      const profile = await loadUserProfile(username);

      expect(profile.fingerprint).toBeDefined();
      expect(profile.fingerprint.device.platform).toBeDefined();
    });

    test('userExists returns correct status', async () => {
      const username = 'test-user';

      expect(userExists(username)).toBe(false);

      await createUserProfile(username, 'headless-smart');

      expect(userExists(username)).toBe(true);
    });
  });
});
