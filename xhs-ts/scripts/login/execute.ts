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

const browserClosedRef = { closed: false };

export async function executeLogin(options: LoginOptions): Promise<void> {
  const { method = 'qr', headless, timeout = TIMEOUTS.LOGIN, creator } = options;

  debugLog(`Login command: method=${method}, headless=${headless}, creator=${creator}`);

  const isLoggedIn = await verifyExistingSession();
  if (isLoggedIn) {
    const result: LoginResult = {
      success: true,
      message: 'Already logged in. Cookies are valid.',
      cookieSaved: true,
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
          result = await smsLogin(session, timeout, browserClosedRef);
        } else {
          debugLog('Starting QR code login...');
          result = await qrLogin(session, timeout, browserClosedRef, isHeadless);
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

export async function checkLogin(): Promise<void> {
  debugLog('Checking login status...');

  try {
    const isLoggedIn = await verifyExistingSession();

    const result: LoginResult = isLoggedIn
      ? {
          success: true,
          message: 'Already logged in. Cookies are valid.',
          cookieSaved: true,
        }
      : {
          success: false,
          message: 'Not logged in. Please run login command first.',
        };

    outputSuccess(result, isLoggedIn ? 'RELAY:已登录，Cookie 有效' : 'RELAY:未登录');
  } catch (error) {
    debugLog('Check login error:', error);
    outputFromError(error);
  }
}
