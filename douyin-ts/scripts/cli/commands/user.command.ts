/**
 * User command
 *
 * @module cli/commands/user.command
 */

import type { Command } from 'commander';
import type { CliUserOptions } from '../types';
import { ensureMigrated, listUsers, setCurrentUser } from '../../user';
import { outputSuccess, outputError } from '../../core/utils/output';
import { DouyinErrorCode } from '../../core/error';
import { debugLog } from '../../core/utils';

/**
 * Register user command
 */
export function registerUserCommand(program: Command): void {
  program
    .command('user')
    .description('用户管理')
    .option('--set-current <name>', '设置当前用户')
    .action(async (options: CliUserOptions) => {
      try {
        await ensureMigrated();

        if (options.setCurrent) {
          await setCurrentUser(options.setCurrent);
          outputSuccess({ current: options.setCurrent }, 'RELAY:已切换到用户 "' + options.setCurrent + '"');
          return;
        }

        const result = await listUsers();
        outputSuccess(result, 'PARSE:users');
      } catch (error) {
        debugLog('User command error:', error);
        if (error instanceof Error) {
          outputError(error.message, DouyinErrorCode.BROWSER_ERROR);
        } else {
          outputError(String(error), DouyinErrorCode.BROWSER_ERROR);
        }
      }
    });
}