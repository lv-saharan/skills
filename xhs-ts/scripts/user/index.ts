/**
 * User module entry point
 *
 * @module user
 * @description Multi-user management and Profile architecture for xhs-ts
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
  EnvironmentType,
  FingerprintSource,
  DeviceProfile,
  UserEnvironment,
  UserProfile,
  ProfileStatus,
  ProfileStatusInfo,
  ProfileRef,
  ProfileMeta,
  ConnectionInfo,
  UserProfileData,
} from './types';

// Storage operations (directory and basic operations)
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
  createUserProfile,
  updateLastUsed,
} from './storage';

// Users metadata operations (users.json)
export {
  loadUsersMeta,
  saveUsersMeta,
  getCurrentUser,
  setCurrentUser,
  clearCurrentUser,
  resolveUser,
} from './users-meta';

// Profile loading
export { loadUserProfile } from './profile-loader';

// v3 Unified Storage API (recommended for browser connections)
export {
  getProfilePath,
  loadUserProfileData,
  saveUserProfileData,
  createUserProfileData,
  loadConnectionInfo,
  saveConnectionInfo,
  clearConnectionInfo,
} from './storage-v3';

// Fingerprint operations
export { getUserFingerprint } from './fingerprint';

// Environment detection
export {
  hasDisplaySupport,
  detectEnvironmentType,
  isLinux,
  isRootUser,
  isContainerEnvironment,
  needsNoSandbox,
  needsDisableDevShm,
} from './environment';

// Migration
export { isMigrationNeeded, ensureMigrated } from './migration';
