/**
 * Configuration loader
 *
 * @module config/loader
 * @description Type-safe JSON configuration loader
 */

import platformJson from './json/platform.json';
import selectorsJson from './json/selectors.json';
import errorsJson from './json/errors.json';
import messagesJson from './json/messages.json';
import type { PlatformConfig, SelectorsConfig, ErrorsConfig, MessagesConfig } from './types';

// ============================================
// Typed Configuration Exports
// ============================================

/** Platform configuration (URLs, timeouts, delays) */
export const platform = platformJson as PlatformConfig;

/** CSS selectors for all platform interactions */
export const selectors = selectorsJson as SelectorsConfig;

/** Error code mappings */
export const errors = errorsJson as ErrorsConfig;

/** User-facing messages */
export const messages = messagesJson as MessagesConfig;

// ============================================
// Convenience Re-exports
// ============================================

/** Platform URLs */
export const urls = platform.urls;

/** Platform domain */
export const domain = platform.domain;

/** Timeout values */
export const timeouts = platform.timeouts;

/** Delay presets */
export const delays = platform.delays;

/** Stealth behavior delays */
export const stealthDelays = platform.stealthDelays;

// ============================================
// Utility Functions
// ============================================

/**
 * Check if URL belongs to this platform
 */
export function isPlatformUrl(url: string): boolean {
  try {
    return new URL(url).hostname.endsWith(platform.domain);
  } catch {
    return false;
  }
}

/**
 * Check if URL is a creator URL
 */
export function isCreatorUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.hostname === 'creator.' + platform.domain;
  } catch {
    return false;
  }
}

/**
 * Get all login selectors as a flat array
 */
export function getLoginSelectorArray(): string[] {
  return [selectors.login.modal, ...selectors.login.buttons, selectors.login.userComponent];
}

/**
 * Get QR selectors as a flat array
 */
export function getQrSelectorArray(): string[] {
  return selectors.login.qr;
}

// ============================================
// Backward Compatibility Aliases
// ============================================

/** @deprecated Use `platform` instead */
export const PLATFORM_CONFIG = platform;

/** @deprecated Use `urls` instead */
export const XHS_URLS = urls;

/** @deprecated Use `urls` instead (uppercase alias) */
export const PLATFORM_URLS = urls;

/** @deprecated Use `isPlatformUrl` instead */
export const isXhsUrl = isPlatformUrl;

/** @deprecated Use `selectors.login.buttons` instead */
export const LOGIN_BUTTON_SELECTORS = selectors.login.buttons;

/** @deprecated Use `selectors.login.modal` instead */
export const LOGIN_MODAL_SELECTOR = selectors.login.modal;

/** @deprecated Use `selectors.login.userComponent` instead */
export const USER_COMPONENT_SELECTOR = selectors.login.userComponent;

/** @deprecated Use `selectors.login.qr` instead */
export const QR_SELECTORS = selectors.login.qr;

/** @deprecated Use `selectors.login.qrTab` instead */
export const QR_TAB_SELECTOR = selectors.login.qrTab;

/** @deprecated Use `getLoginSelectorArray()` instead */
export const LOGIN_MODAL_SELECTORS = getLoginSelectorArray();

// ============================================
// UPPERCASE Compatibility Objects
// ============================================

/**
 * UPPERCASE compatibility timeouts object
 * @deprecated Use `timeouts` (camelCase) instead
 */
export const TIMEOUTS = {
  NETWORK_IDLE: timeouts.networkIdle,
  PAGE_LOAD: timeouts.pageLoad,
  UPLOAD: timeouts.upload ?? 120000,
  LOGIN: timeouts.login,
  SELECTOR: timeouts.selector,
  QR_CHECK_INTERVAL: timeouts.qrCheckInterval,
} as const;

/**
 * UPPERCASE compatibility delays object
 * @deprecated Use `delays` (camelCase) instead
 */
export const DELAYS = delays;

/**
 * UPPERCASE compatibility stealth delays object
 * @deprecated Use `stealthDelays` (camelCase) instead
 */
export const STEALTH_DELAYS = stealthDelays;
