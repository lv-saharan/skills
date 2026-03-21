/**
 * Login command implementation
 *
 * @module login/execute
 * @description Handle user authentication via QR code or SMS
 */

import type { BrowserInstance } from '../browser';
import { createBrowserInstance, closeBrowserInstance } from '../browser';
import { TIMEOUTS } from '../shared';
import { config, debugLog } from '../utils/helpers';
import { outputSuccess, outputFromError } from '../utils/output';
import type { LoginOptions, LoginResult } from './types';
import { qrLogin } from './qr';
import { smsLogin } from './sms';
import { verifyExistingSession } from './verify';

// ============================================
// Constants
// ============================================

/** Default login timeout in milliseconds */
// Use TIMEOUTS.LOGIN from shared/constants

/** Browser closed reference for QR login */
const browserClosedRef = { closed: false };

// ============================================
// Main Login Function
// ============================================

/**
 * Execute login command
 */
export async function executeLogin(options: LoginOptions): Promise<void> {
  const { method = 'qr', headless, timeout = TIMEOUTS.LOGIN, creator } = options;

  debugLog(`Login command: method=${method}, headless=${headless}, creator=${creator}`);
  debugLog(`Headless mode: ${headless ?? config.headless}`);

  // Check if already logged in
  const isLoggedIn = await verifyExistingSession();
  if (isLoggedIn) {
    const result: LoginResult = {
      success: true,
      message: 'Already logged in. Cookies are valid.',
      cookieSaved: true,
    };
    outputSuccess(result, 'RELAY:已登录，Cookie有效');
    return;
  }

  let instance: BrowserInstance | null = null;

  try {
    // Create browser instance
    const isHeadless = headless ?? config.headless;
    debugLog('Creating browser instance...');
    instance = await createBrowserInstance({ headless: isHeadless });
    debugLog('Browser instance created');

    // Perform login based on method
    let result: LoginResult;

    if (method === 'sms') {
      debugLog('Starting SMS login...');
      result = await smsLogin(instance, timeout, browserClosedRef);
    } else {
      debugLog('Starting QR code login...');
      result = await qrLogin(instance, timeout, browserClosedRef, isHeadless);
    }

    debugLog('Login complete, outputting result...');
    outputSuccess(result, 'RELAY:登录成功');
    debugLog('Result output complete');
  } catch (error) {
    debugLog('Login error:', error);
    outputFromError(error);
  } finally {
    debugLog('Closing browser...');
    await closeBrowserInstance(instance);
    debugLog('Browser closed');
  }
}

/**
 * Check login status
 */
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

    outputSuccess(result, isLoggedIn ? 'RELAY:已登录，Cookie有效' : 'RELAY:未登录');
  } catch (error) {
    debugLog('Check login error:', error);
    outputFromError(error);
  }
}
