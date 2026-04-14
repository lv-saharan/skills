/**
 * Session Management - Unified Authentication Entry
 *
 * @module actions/shared/session
 * @description Unified session orchestration for all Xiaohongshu actions.
 *              Provides browser lifecycle + authentication in a single API.
 *
 * This module is the SINGLE source of truth for session management.
 * All actions should use withSession or withAuthenticatedAction.
 *
 * For page preparation, use page-prep.ts instead.
 */

import type { Page } from 'playwright';
import type { UserName } from '../../user';
import type { StealthBehaviorConfig, ProfileLaunchOptions } from './browser-launcher';
import { withProfile, randomStealthDelay } from './browser-launcher';
import { resolveUser } from '../../user';
import { SkillError, SkillErrorCode } from '../../config/errors';
import { timeouts, urls } from '../../config/loader';
import { detectLoginStatus } from '../auth/status';
import { autoLogin } from './auto-login';

// Import types from page-prep for consistency
export type { PageErrorType, PreparePageResult } from './page-prep';

// ============================================
// Session Types
// ============================================

export interface SessionContext {
  page: Page;
  user: UserName;
  behavior: StealthBehaviorConfig;
  port: number;
  isNewInstance: boolean;
}

export interface SessionOptions {
  headless?: boolean;
  autoCreate?: boolean;
  skipLogin?: boolean;
  navigateHome?: boolean;
}

export interface AuthenticatedActionOptions {
  headless?: boolean;
  skipLogin?: boolean;
}

// ============================================
// Constants
// ============================================

export { delays as INTERACTION_DELAYS } from '../../config/loader';

// ============================================
// Core Session API
// ============================================

export async function withSession<T>(
  user: UserName | undefined,
  callback: (ctx: SessionContext) => Promise<T>,
  options: SessionOptions = {}
): Promise<T> {
  const { headless = false, autoCreate = true, skipLogin = false, navigateHome = true } = options;
  const resolvedUser = user ?? resolveUser();

  return withProfile(
    resolvedUser,
    async (page, profileResult) => {
      const { behavior, port, isNewInstance } = profileResult;

      if (navigateHome) {
        await page.goto(urls.home, { waitUntil: 'domcontentloaded', timeout: timeouts.pageLoad });
        await page
          .waitForLoadState('networkidle', { timeout: timeouts.networkIdle })
          .catch(() => {});
        await randomStealthDelay(behavior, 'read');
      }

      if (!skipLogin) {
        const status = await detectLoginStatus(page);

        if (!status.isLoggedIn) {
          const loginResult = await autoLogin(page, {
            user: resolvedUser,
            timeout: timeouts.login,
          });

          if (!loginResult.success) {
            throw new SkillError(
              loginResult.message || 'Not logged in',
              SkillErrorCode.NOT_LOGGED_IN
            );
          }
        }
      }

      return callback({ page, user: resolvedUser, behavior, port, isNewInstance });
    },
    { headless, autoCreate } as ProfileLaunchOptions
  );
}

export async function withAuthenticatedAction<T>(
  headless: boolean | undefined,
  user: UserName | undefined,
  callback: (page: Page, behavior: StealthBehaviorConfig) => Promise<T>,
  options?: AuthenticatedActionOptions
): Promise<T> {
  return withSession(user, async (ctx) => callback(ctx.page, ctx.behavior), {
    headless: headless ?? options?.headless,
    skipLogin: options?.skipLogin,
    navigateHome: true,
  });
}
