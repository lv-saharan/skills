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
    .description('Login to Xiaohongshu and save cookies')
    .option('--qr', 'Use QR code login (default)')
    .option('--sms', 'Use SMS login')
    .option('--phone <number>', 'Phone number for SMS login')
    .option('--cookie-string <string>', 'Cookie string for direct login')
    .option('--headless', 'Run in headless mode')
    .option('--timeout <ms>', 'Login timeout in milliseconds')
    .option('--user <name>', 'User name')
    .action(async (options: LoginCommandOptions) => {
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
