/**
 * Login command implementation
 *
 * @module login/execute
 * @description Handle user authentication via QR code or SMS
 */

import { withProfile } from '../shared/browser-launcher';
import { timeouts } from '../../config';
import { debugLog } from '../../core/utils';
import { config } from '../../config';
import { outputSuccess, outputFromError } from '../../core/utils/output';
import type { LoginOptions, LoginResult } from './types';
import { qrLogin } from './qr';
import { smsLogin } from './sms';
import { verifyExistingSession } from './verify';
import { createUserDir, userExists, resolveUser } from '../../user';

export async function executeLogin(options: LoginOptions): Promise<void> {
  const { method = 'qr', headless, timeout = timeouts.login, creator, user } = options;
  const resolvedUser = resolveUser(user);

  debugLog(
    `Login command: method=${method}, headless=${headless}, creator=${creator}, user=${user}, resolvedUser=${resolvedUser}`
  );

  // Create user directory if not exists
  if (resolvedUser && !userExists(resolvedUser)) {
    await createUserDir(resolvedUser);
    debugLog(`Created user directory: ${resolvedUser}`);
  }

  // Check if already logged in for this user
  const isLoggedIn = await verifyExistingSession(resolvedUser);
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

  // Session invalid - proceed with login flow
  debugLog('Proceeding with login flow...');

  const isHeadless = headless ?? config.headless;

  try {
    await withProfile(
      resolvedUser,
      async (page, profileResult) => {
        const { browser, context } = profileResult;

        // Create session object compatible with BrowserSession interface
        const session = {
          page,
          context,
          browser,
        };

        let result: LoginResult;
        if (method === 'sms') {
          debugLog('Starting SMS login...');
          result = await smsLogin(session, timeout, resolvedUser);
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
    outputFromError(error);
  }
}

export async function checkLogin(user?: string): Promise<void> {
  debugLog('Checking login status...');

  const resolvedUser = resolveUser(user);
  const isLoggedIn = await verifyExistingSession(resolvedUser);

  const result: LoginResult = isLoggedIn
    ? {
        success: true,
        message: 'Already logged in. Cookies are valid.',
        cookieSaved: true,
        user: resolvedUser,
      }
    : {
        success: false,
        message: 'Not logged in. Please run login command.',
        user: resolvedUser,
      };

  outputSuccess(result, isLoggedIn ? 'RELAY:已登录，Cookie 有效' : 'RELAY:未登录');
}
