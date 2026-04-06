/**
 * Login actions
 *
 * @module actions/login
 * @description Login functionality for Douyin
 */

import type { Page } from 'playwright';
import type { UserName } from '../../user/types';
import { withSession, type SessionContext } from '../shared/session';
import { outputSuccess, outputError } from '../../core/utils/output';
import { DouyinErrorCode } from '../../core/error';
import { debugLog, delay } from '../../core/utils';

// ============================================
// Types
// ============================================

export type LoginMethod = 'qr' | 'sms';

export interface LoginOptions {
  method?: LoginMethod;
  headless?: boolean;
  timeout?: number;
  user?: UserName;
}

export interface LoginResult {
  success: boolean;
  message?: string;
}

// ============================================
// Login Implementation
// ============================================

/**
 * Execute login
 *
 * Uses withSession which handles browser launch, navigation, and auto-login.
 */
export async function executeLogin(options: LoginOptions): Promise<void> {
  const { headless = false, timeout = 120000, user } = options;

  try {
    await withSession(
      user,
      async (ctx: SessionContext) => {
        const { page } = ctx;

        // withSession already handles login verification
        // If we reach here, we're logged in
        debugLog('Login successful');

        outputSuccess({ success: true }, 'RELAY:登录成功');
      },
      { headless, autoCreate: true }
    );
  } catch (error) {
    if (error instanceof Error) {
      outputError(error.message, DouyinErrorCode.LOGIN_FAILED);
    } else {
      outputError(String(error), DouyinErrorCode.LOGIN_FAILED);
    }
  }
}

/**
 * Check login status
 */
export async function checkLogin(page: Page): Promise<boolean> {
  // Check for user avatar or profile element
  const userElement = await page.locator('[class*="user"]').first().isVisible().catch(() => false);
  return userElement;
}