/**
 * Shared module
 *
 * @module shared
 * @description Global shared types and utilities used across modules
 */

// Error types
export { XhsError, XhsErrorCode } from './errors';
export type { XhsErrorCodeType } from './errors';

// Shared types
export type { LoginMethod } from './types';

// Shared constants
export { TIMEOUTS, XHS_URLS } from './constants';
