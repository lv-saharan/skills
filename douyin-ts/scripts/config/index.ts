/**
 * Config module
 *
 * @module config
 * @description Centralized configuration loaded from environment variables
 */

export {
  config,
  validateConfig,
  getProjectRoot,
  getTmpDir,
  getTmpFilePath,
  generateTimestamp,
  generateFileName,
  DY_URLS,
} from './config';

export type { AppConfig } from './types';