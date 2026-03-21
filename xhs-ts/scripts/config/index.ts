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
} from './config';

export type { AppConfig } from './types';
