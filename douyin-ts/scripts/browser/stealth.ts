/**
 * Stealth injection script
 */

import type { UserFingerprint } from '../user/types';

export function generateStealthScript(fingerprint?: UserFingerprint): string {
  return `
Object.defineProperty(navigator, 'webdriver', { get: () => undefined, configurable: true });
Object.defineProperty(navigator, 'platform', { get: () => 'Win32', configurable: true });
Object.defineProperty(navigator, 'languages', { get: () => ['zh-CN', 'zh', 'en'], configurable: true });
window.chrome = window.chrome || { runtime: {}, app: {} };
`;
}

export const STEALTH_INJECTION_SCRIPT = generateStealthScript();
