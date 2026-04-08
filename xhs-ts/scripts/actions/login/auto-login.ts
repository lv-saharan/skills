/**
 * Auto Login - Re-export from shared (backward compatibility)
 *
 * @module login/auto-login
 * @description This module has been moved to shared/auto-login.ts
 *
 * @deprecated Import from '../shared/auto-login' or '../shared' instead.
 *             This re-export is maintained for backward compatibility.
 *
 * Moved to resolve circular dependency between shared and login modules.
 */

export { autoLogin } from '../shared/auto-login';
export type { AutoLoginOptions, AutoLoginResult } from '../shared/auto-login';
