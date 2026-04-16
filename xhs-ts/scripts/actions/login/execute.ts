/**
 * Login command implementation
 */

import { withProfile } from '../shared/browser-launcher';
import { timeouts } from '../../config';
import { debugLog } from '../../core/utils';
import { config } from '../../config';
import { outputSuccess, outputFromError, outputError } from '../../core/utils/output';
import type { LoginOptions, LoginResult } from './types';
import { qrLogin } from './qr';
import { smsLogin } from './sms';
import { cookieLogin } from './cookie';
import { verifySession } from '../auth/verify-session';
import { createUserDir, userExists, resolveUser } from '../../user';
import { isUserDataCorruptedError } from '../../core/browser/errors';
import { canCleanupUserData } from '../../user/storage';

export async function executeLogin(options: LoginOptions): Promise<void> {
  const {
    method = 'qr',
    headless,
    timeout = timeouts.login,
    creator,
    user,
    phone,
    cookieString,
  } = options;
  const resolvedUser = resolveUser(user);

  debugLog(
    'Login command: method=' +
      method +
      ', headless=' +
      headless +
      ', creator=' +
      creator +
      ', user=' +
      user +
      ', resolvedUser=' +
      resolvedUser +
      ', hasCookieString=' +
      !!cookieString
  );

  if (resolvedUser && !userExists(resolvedUser)) {
    await createUserDir(resolvedUser);
    debugLog('Created user directory: ' + resolvedUser);
  }

  const isHeadless = headless ?? config.headless;

  // Skip session verification for cookie login (we're injecting new cookies)
  if (method !== 'cookie') {
    const isLoggedIn = await verifySession(resolvedUser, isHeadless);
    if (isLoggedIn) {
      const result: LoginResult = {
        success: true,
        message: 'Already logged in. Cookies are valid.',
        cookieSaved: true,
        user: resolvedUser,
      };
      outputSuccess(result, 'RELAY:已登录，Cookie 有效');
      return;
    }
  }

  debugLog('Proceeding with login flow...');

  try {
    await withProfile(
      resolvedUser,
      async (page, profileResult) => {
        const { browser, context } = profileResult;
        const session = { page, context, browser };

        let result: LoginResult;
        if (method === 'cookie') {
          debugLog('Starting cookie login...');
          if (!cookieString) {
            throw new Error('cookieString is required for cookie login method');
          }
          result = await cookieLogin(session, cookieString, resolvedUser);
        } else if (method === 'sms') {
          debugLog('Starting SMS login...');
          result = await smsLogin(session, timeout, resolvedUser, phone);
        } else {
          debugLog('Starting QR code login...');
          result = await qrLogin(session, timeout, isHeadless, resolvedUser);
        }

        debugLog('Login complete, outputting result...');
        outputSuccess(result, 'RELAY:登录成功');
      },
      { headless: isHeadless, autoCreate: true }
    );
  } catch (error) {
    debugLog('Login error:', error);

    // Handle UserDataCorruptedError specially
    if (isUserDataCorruptedError(error)) {
      debugLog('User data corrupted, suggesting cleanup...');

      // Check if cleanup is safe
      const canCleanup = await canCleanupUserData(resolvedUser);

      outputError(error.message, error.code, {
        user: error.user,
        userDataPath: error.userDataPath,
        suggestCleanup: true,
        canCleanup,
        hint: canCleanup
          ? '用户数据可能已损坏。请运行 "npm run user -- --cleanup <用户名>" 清理后重新登录。'
          : '用户数据可能已损坏，但浏览器正在运行。请先关闭浏览器后再尝试清理。',
      });
      return;
    }

    outputFromError(error);
  }
}
