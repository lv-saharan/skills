/**
 * Config module
 *
 * @module config
 * @description Centralized configuration loaded from environment variables
 */

export { config, getTmpDir, getTmpFilePath, validateConfig } from './config';

export type { AppConfig } from './types';
