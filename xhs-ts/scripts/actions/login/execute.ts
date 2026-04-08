/**
 * Login command implementation
 */

import { withProfile } from '../shared/browser-launcher';
import { timeouts } from '../../config';
import { debugLog } from '../../core/utils';
import { config } from '../../config';
import { outputSuccess, outputFromError } from '../../core/utils/output';
import type { LoginOptions, LoginResult } from './types';
import { qrLogin } from './qr';
import { smsLogin } from './sms';
import { verifySession } from '../auth/verify-session';
import { createUserDir, userExists, resolveUser } from '../../user';

export async function executeLogin(options: LoginOptions): Promise<void> {
  const { method = 'qr', headless, timeout = timeouts.login, creator, user, phone } = options;
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
      resolvedUser
  );

  if (resolvedUser && !userExists(resolvedUser)) {
    await createUserDir(resolvedUser);
    debugLog('Created user directory: ' + resolvedUser);
  }

  const isHeadless = headless ?? config.headless;
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

  debugLog('Proceeding with login flow...');

  try {
    await withProfile(
      resolvedUser,
      async (page, profileResult) => {
        const { browser, context } = profileResult;
        const session = { page, context, browser };

        let result: LoginResult;
        if (method === 'sms') {
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
    outputFromError(error);
  }
}
