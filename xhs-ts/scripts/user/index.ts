/**
 * User module entry point
 *
 * @module user
 * @description Multi-user management for xhs-ts
 */

// Types
export type { UserName, UserInfo, UserListResult, UsersMeta } from './types';

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

// Migration
export { isMigrationNeeded, migrateToMultiUser, ensureMigrated } from './migration';
