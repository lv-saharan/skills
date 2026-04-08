/**
 * Check Error Page
 *
 * @module actions/auth/check-error
 * @description Detect error pages - used by session.ts and page-utils.ts
 */

import type { Page } from 'playwright';
import { debugLog } from '../../core/utils';

// ============================================
// Types
// ============================================

/**
 * Result of checkErrorPage
 */
export interface ErrorPageResult {
  isError: boolean;
  errorCode?: string;
  errorMsg?: string;
}

// ============================================
// Error Page Detection
// ============================================

/**
 * Check for error page
 *
 * @param page - Playwright page
 * @returns Error page result
 */
export async function checkErrorPage(page: Page): Promise<ErrorPageResult> {
  try {
    const currentUrl = page.url();

    if (currentUrl.includes('/error') || currentUrl.includes('error_code')) {
      const urlObj = new URL(currentUrl);
      const errorCode = urlObj.searchParams.get('error_code') || undefined;
      const errorMsg = urlObj.searchParams.get('error_msg') || undefined;

      debugLog('Error page detected', { errorCode, errorMsg, url: currentUrl });
      return { isError: true, errorCode, errorMsg };
    }

    return { isError: false };
  } catch (error) {
    debugLog('Error checking error page:', error);
    return { isError: false };
  }
}
