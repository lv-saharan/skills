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
  UserMeta,
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
  loadUsersMetaAsync,
  saveUsersMeta,
  getCurrentUser,
  getCurrentUserAsync,
  setCurrentUser,
  clearCurrentUser,
  resolveUser,
  resolveUserAsync,
} from './users-meta';

// Profile loading
export { loadUserProfile } from './profile-loader';

// v3 Unified Storage API (recommended for CDP connections)
export {
  getProfilePath,
  loadUserProfileData,
  saveUserProfileData,
  createUserProfileData,
  hasProfileData,
  loadConnectionInfo,
  saveConnectionInfo,
  clearConnectionInfo,
  updateConnectionActivity,
  updateProfileLastUsed,
} from './storage-v3';

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

// Environment detection
export {
  hasDisplaySupport,
  detectDeviceProfile,
  detectEnvironmentType,
  detectEnvironment,
  selectPresetBySmartMatch,
  getMostMainstreamPresetInfo,
} from './environment';

// Migration
export { isMigrationNeeded, migrateToMultiUser, ensureMigrated } from './migration';
