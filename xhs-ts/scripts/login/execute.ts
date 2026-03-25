/**
 * Login command implementation
 *
 * @module login/execute
 * @description Handle user authentication via QR code or SMS
 */

import { withSession } from '../browser';
import { TIMEOUTS } from '../shared';
import { config, debugLog } from '../utils/helpers';
import { outputSuccess, outputFromError } from '../utils/output';
import type { LoginOptions, LoginResult } from './types';
import { qrLogin } from './qr';
import { smsLogin } from './sms';
import { verifyExistingSession } from './verify';
import { createUserDir, userExists } from '../user';

const browserClosedRef = { closed: false };

export async function executeLogin(options: LoginOptions): Promise<void> {
  const { method = 'qr', headless, timeout = TIMEOUTS.LOGIN, creator, user } = options;

  debugLog(
    `Login command: method=${method}, headless=${headless}, creator=${creator}, user=${user}`
  );

  // Create user directory if not exists
  if (user && !userExists(user)) {
    await createUserDir(user);
    debugLog(`Created user directory: ${user}`);
  }

  // Check if already logged in for this user
  const isLoggedIn = await verifyExistingSession(user);
  if (isLoggedIn) {
    const result: LoginResult = {
      success: true,
      message: 'Already logged in. Cookies are valid.',
      cookieSaved: true,
      user,
    };
    outputSuccess(result, 'RELAY:已登录，Cookie 有效');
    return;
  }

  try {
    await withSession(
      async (session) => {
        const isHeadless = headless ?? config.headless;
        debugLog('Session created');

        let result: LoginResult;
        if (method === 'sms') {
          debugLog('Starting SMS login...');
          result = await smsLogin(session, timeout, browserClosedRef, user);
        } else {
          debugLog('Starting QR code login...');
          result = await qrLogin(session, timeout, browserClosedRef, isHeadless, user);
        }

        debugLog('Login complete, outputting result...');
        outputSuccess(result, 'RELAY:登录成功');
      },
      { headless: headless ?? config.headless }
    );
  } catch (error) {
    debugLog('Login error:', error);
    outputFromError(error);
  }
}

export async function checkLogin(user?: string): Promise<void> {
  debugLog('Checking login status...');

  try {
    const isLoggedIn = await verifyExistingSession(user);

    const result: LoginResult = isLoggedIn
      ? {
          success: true,
          message: 'Already logged in. Cookies are valid.',
          cookieSaved: true,
          user,
        }
      : {
          success: false,
          message: 'Not logged in. Please run login command first.',
          user,
        };

    outputSuccess(result, isLoggedIn ? 'RELAY:已登录，Cookie 有效' : 'RELAY:未登录');
  } catch (error) {
    debugLog('Check login error:', error);
    outputFromError(error);
  }
}
