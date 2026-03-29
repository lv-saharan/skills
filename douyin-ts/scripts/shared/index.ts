/**
 * Shared module
 *
 * @module shared
 * @description Global shared types and utilities used across modules
 */

// Error types
export { DouyinError, DouyinErrorCode } from './errors';
export type { DouyinErrorCodeType } from './errors';

// Shared types
export type { LoginMethod } from './types';

// Shared constants
export { TIMEOUTS } from './constants';
