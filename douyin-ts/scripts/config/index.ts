/**
 * Config module entry
 *
 * @module config
 * @description Configuration layer for platform automation.
 *              Contains: JSON config loader, platform errors, environment config.
 *
 * RESPONSIBILITY: This module only exports configuration that ALL base modules can use.
 * Business-specific configurations belong in their respective action modules:
 * - Login selectors: actions/login/selectors.ts
 * - Interact selectors: actions/interact/selectors.ts
 * - Scrape selectors: actions/scrape/selectors.ts
 * - Search selectors: actions/search/url-builder.ts
 * - Session management: actions/shared/session.ts
 *
 * ARCHITECTURE NOTE:
 * Session-related functions (withSession, detectLoginStatus, checkErrorPage, etc.)
 * have been moved to actions/shared/session.ts to eliminate the reverse dependency
 * (config should not depend on actions). Import directly from actions/shared/session.
 *
 * Path utilities (getTmpDir, getTmpFilePath) have been moved to core/utils/path.ts
 * for better module separation. Import from core/utils instead.
 */

// ============================================
// JSON Configuration Loader
// ============================================

export { platform, urls, domain, timeouts, delays, stealthDelays, isPlatformUrl } from './loader';

// ============================================
// Platform Errors
// ============================================

export { SkillError, SkillErrorCode, type SkillErrorCodeType } from './errors';

// ============================================
// Environment Configuration
// ============================================

export { config, validateConfig } from './config';

// ============================================
// Types
// ============================================

export type { PlatformConfig, DelayConfig, RangeConfig, LoginMethod, AppConfig } from './types';
