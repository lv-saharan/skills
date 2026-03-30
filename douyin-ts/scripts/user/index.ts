/**
 * User module entry point
 *
 * @module user
 * @description Multi-user management and Profile architecture for douyin-ts
 */

// Types
export type {
  UserName,
  UserInfo,
  UserListResult,
  UsersMeta,
  UserFingerprint,
  DeviceConfig,
  WebGLConfig,
  BrowserConfig,
  ScreenConfig,
  DevicePlatform,
  // New Profile types (Task 1)
  EnvironmentType,
  FingerprintSource,
  DeviceProfile,
  UserEnvironment,
  UserMeta,
  UserProfile,
  ProfileStatus,
  ProfileStatusInfo,
  ProfileRef,
} from './types';

// Storage operations
export {
  getUsersDir,
  getUserDir,
  getUserTmpDir,
  getUserDataDir,
  validateUserName,
  isValidUserName,
  usersDirExists,
  userExists,
  hasProfile,
  getProfileStatus,
  createUserDir,
  listUsers,
  loadUsersMeta,
  loadUsersMetaAsync,
  saveUsersMeta,
  getCurrentUser,
  getCurrentUserAsync,
  setCurrentUser,
  clearCurrentUser,
  resolveUser,
  resolveUserAsync,
  // Profile operations
  createUserProfile,
  loadUserProfile,
  updateLastUsed,
} from './storage';

// Fingerprint operations (includes getMostMainstreamPreset)
export {
  getUserFingerprint,
  saveUserFingerprint,
  hasUserFingerprint,
  regenerateUserFingerprint,
  getFingerprintInfo,
  getMostMainstreamPreset,
  getDefaultPresetInfo,
} from './fingerprint';

// Environment detection (Task 2)
export {
  hasDisplaySupport,
  detectDeviceProfile,
  detectEnvironmentType,
  detectEnvironment,
  selectPresetBySmartMatch,
  getMostMainstreamPresetInfo,
  generateEnvironmentFingerprint,
  generateFingerprint,
} from './environment';

// Migration
export { isMigrationNeeded, migrateToMultiUser, ensureMigrated } from './migration';