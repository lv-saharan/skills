/**
 * Login Command
 *
 * @module cli/commands/login.command
 */

import type { Command } from 'commander';
import { resolveUser } from '../../user';
import { config, timeouts } from '../../config';
import { parseNumberOption, resolveHeadless } from '../utils';
import type { LoginCommandOptions } from '../types';

export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('Login to Douyin and save cookies')
    .option('--qr', 'Use QR code login (default)')
    .option('--sms', 'Use SMS login')
    .option('--phone <number>', 'Phone number for SMS login')
    .option('--cookie-string <string>', 'Cookie string for direct login')
    .option('--headless', 'Run in headless mode')
    .option('--timeout <ms>', 'Login timeout in milliseconds')
    .option('--user <name>', 'User name')
    .option('--reset-user-data', 'Clear corrupted user data before login')
    .action(async (options: LoginCommandOptions & { resetUserData?: boolean }) => {
      // Handle --reset-user-data flag
      if (options.resetUserData) {
        const { cleanupUserData, canCleanupUserData } = await import('../../user/storage');
        const { outputSuccess, outputError } = await import('../../core/utils/output');
        const user = resolveUser(options.user);

        const canCleanup = await canCleanupUserData(user);
        if (!canCleanup) {
          outputError(
            'Cannot cleanup user data: browser is running or user does not exist',
            'CLEANUP_NOT_SAFE'
          );
          return;
        }

        const cleanedPath = await cleanupUserData(user, false);
        outputSuccess({ user, cleanedPath }, 'RELAY:已清理用户数据，请重新登录');
        return;
      }

      const { executeLogin } = await import('../../actions/login');
      // Determine login method: cookie > sms > qr
      const method = options.cookieString ? 'cookie' : options.sms ? 'sms' : 'qr';
      const timeout = parseNumberOption(options.timeout, timeouts.login);

      await executeLogin({
        method,
        headless: resolveHeadless(options.headless, config.headless),
        user: resolveUser(options.user),
        timeout,
        phone: options.phone,
        cookieString: options.cookieString,
      });
    });
}
