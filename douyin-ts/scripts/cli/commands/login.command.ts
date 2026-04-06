/**
 * Login command
 *
 * @module cli/commands/login.command
 */

import type { Command } from 'commander';
import type { CliLoginOptions } from '../types';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { executeLogin } from '../../actions/login';

/**
 * Register login command
 */
export function registerLoginCommand(program: Command): void {
  program
    .command('login')
    .description('QR 码登录')
    .option('--headless', '无头模式')
    .option('--timeout <ms>', '超时时间')
    .option('--user <name>', '用户名')
    .action(async (options: CliLoginOptions) => {
      const headless = options.headless !== undefined ? options.headless : config.headless;
      const user = resolveUser(options.user);
      const timeout = options.timeout ? parseInt(options.timeout, 10) : config.loginTimeout;

      await executeLogin({ method: 'qr', headless, timeout, user });
    });
}