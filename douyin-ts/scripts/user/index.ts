/**
 * User module entry point
 *
 * @module user
 * @description Multi-user management for douyin-ts
 */

// Types
export type {
  UserName,
  UserInfo,
  UserListResult,
  UsersMeta,
  DevicePlatform,
  ScreenConfig,
  DeviceConfig,
  WebGLConfig,
  BrowserConfig,
  UserFingerprint,
} from './types';

// Storage operations
export {
  getUsersDir,
  getUserDir,
  getUserTmpDir,
  validateUserName,
  isValidUserName,
  usersDirExists,
  userExists,
  createUserDir,
  listUsers,
  loadUsersMeta,
  saveUsersMeta,
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  resolveUser,
} from './storage';

// Fingerprint operations
export {
  getUserFingerprint,
  saveUserFingerprint,
  hasUserFingerprint,
  regenerateUserFingerprint,
  getFingerprintInfo,
  getMostMainstreamPreset,
  getDefaultPresetInfo,
} from './fingerprint';

// Migration
export { isMigrationNeeded, migrateToMultiUser, ensureMigrated } from './migration';
