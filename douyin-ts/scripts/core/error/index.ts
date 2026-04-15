/**
 * Error module entry
 *
 * @module core/error
 * @description Platform-agnostic error framework
 */

export type { StandardErrorCode, PlatformErrorConfig } from './types';
export { PlatformError, createPlatformError } from './types';
