/**
 * SMS login implementation
 *
 * @module login/sms
 * @description SMS authentication flow with human-like input simulation
 */

import type { Page } from 'playwright';
import type { BrowserInstance } from '../../core/browser/types';
import type { UserName } from '../../user';
import { SkillError, SkillErrorCode, urls, isPlatformUrl } from '../../config';
import { debugLog, delay, randomDelay, waitForCondition } from '../../core/utils';
import { humanClick, humanType } from '../../core/anti-detect';
import { isLoggedIn } from '../auth/status';
import { SMS_SELECTORS } from './selectors';
import type { LoginResult } from './types';

// ============================================
// Helper Functions
// ============================================

/**
 * Enter phone number with human-like typing
 */
async function enterPhoneNumber(page: Page, phone: string): Promise<void> {
  debugLog('Entering phone number...');

  const phoneInput = page.locator(SMS_SELECTORS.phoneInput).first();
  const isVisible = await phoneInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isVisible) {
    throw new SkillError('Phone number input not found', SkillErrorCode.NOT_FOUND);
  }

  // Click to focus
  await phoneInput.click();
  await delay(200 + Math.random() * 300);

  // Type phone number with human-like delays
  await humanType(phoneInput, phone, {
    minDelay: 60,
    maxDelay: 150,
    thinkPauseChance: 0.05,
    typoChance: 0.01,
    clearFirst: true,
  });

  debugLog('Phone number entered successfully');
}

/**
 * Send SMS verification code
 */
async function sendSmsCode(page: Page): Promise<void> {
  debugLog('Clicking send SMS button...');

  const sendButton = page.locator(SMS_SELECTORS.sendSmsButton).first();
  const isVisible = await sendButton.isVisible({ timeout: 3000 }).catch(() => false);

  if (!isVisible) {
    throw new SkillError('Send SMS button not found', SkillErrorCode.NOT_FOUND);
  }

  // Wait a moment before clicking (human-like hesitation)
  await delay(500 + Math.random() * 500);

  // Click send button
  await sendButton.click();
  await delay(1000 + Math.random() * 500);

  debugLog('SMS verification code sent');
}

/**
 * Enter SMS verification code with human-like typing
 */
async function enterSmsCode(page: Page, code: string): Promise<void> {
  debugLog('Entering SMS verification code...');

  const codeInput = page.locator(SMS_SELECTORS.smsCodeInput).first();
  const isVisible = await codeInput.isVisible({ timeout: 5000 }).catch(() => false);

  if (!isVisible) {
    throw new SkillError('SMS code input not found', SkillErrorCode.NOT_FOUND);
  }

  // Click to focus
  await codeInput.click();
  await delay(200 + Math.random() * 300);

  // Type verification code with human-like delays
  await humanType(codeInput, code, {
    minDelay: 80,
    maxDelay: 200,
    thinkPauseChance: 0.1, // Slightly higher for 6-digit code
    typoChance: 0, // No typos for verification code
    clearFirst: true,
  });

  debugLog('SMS verification code entered');
}

/**
 * Wait for user to input SMS code via console
 */
async function waitForUserInputCode(): Promise<string> {
  return new Promise((resolve) => {
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    rl.question('Please enter the SMS verification code: ', (answer: string) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

// ============================================
// Main Login Functions
// ============================================

/**
 * Perform SMS login (interactive - prompts for verification code)
 *
 * @param instance - Browser instance
 * @param timeout - Login timeout in ms
 * @param user - User name
 * @param phone - Phone number (optional, will prompt if not provided)
 */
export async function smsLogin(
  instance: BrowserInstance,
  timeout: number,
  user?: UserName,
  phone?: string
): Promise<LoginResult> {
  const { page } = instance;

  await page.goto(urls.login);
  await randomDelay(1000, 2000);

  // Click SMS login tab
  const smsTabClicked = await humanClick(page, 'text=手机登录, text=短信登录, [class*="sms"]');
  if (!smsTabClicked) {
    throw new SkillError('Cannot find SMS login option', SkillErrorCode.LOGIN_FAILED);
  }

  await delay(1000);

  // If phone number provided, enter it automatically
  if (phone) {
    try {
      await enterPhoneNumber(page, phone);
      await sendSmsCode(page);
    } catch {
      debugLog('Failed to enter phone number automatically, falling back to manual input');
      console.error('Please enter your phone number and send SMS code in the browser window.');
    }
  } else {
    console.error('Please enter your phone number and send SMS code in the browser window.');
  }

  // Wait for user to provide verification code
  let code: string | undefined;
  try {
    code = await waitForUserInputCode();
  } catch {
    debugLog('Failed to get verification code from console, waiting for manual input');
    console.error('Please enter the verification code in the browser window.');
  }

  // If code provided, enter it automatically
  if (code && code.length === 6 && /^\d+$/.test(code)) {
    try {
      await enterSmsCode(page, code);
    } catch {
      debugLog('Failed to enter SMS code automatically, falling back to manual input');
      console.error('Please enter the verification code in the browser window.');
    }
  }

  // Wait for login to complete
  await waitForCondition(
    async () => {
      if (page.isClosed()) {
        throw new SkillError(
          'Browser window closed by user. Login cancelled.',
          SkillErrorCode.LOGIN_FAILED
        );
      }

      const currentUrl = page.url();
      if (!currentUrl.includes('/login') && isPlatformUrl(currentUrl)) {
        debugLog('Redirected from login page, checking login status...');
        await delay(2000);

        const loggedIn = await isLoggedIn(page);
        if (loggedIn) {
          debugLog('Login successful via SMS');
          return true;
        }
      }

      return false;
    },
    {
      timeout,
      interval: 1000,
      timeoutMessage: 'SMS login timeout. Please try again.',
      onProgress: (elapsed) => debugLog(`[${elapsed}s] Waiting for SMS login...`),
    }
  );

  debugLog('Login successful. Session will auto-persist to profile.');

  return {
    success: true,
    message: 'Login successful. Session persisted to profile.',
    cookieSaved: true,
    user,
  };
}

/**
 * Perform SMS login with phone number (semi-automated)
 *
 * @param page - Playwright page
 * @param phone - Phone number
 * @param code - SMS verification code (6 digits)
 */
