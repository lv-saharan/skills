/**
 * User Command
 *
 * @module cli/commands/user.command
 */

import type { Command } from 'commander';
import { listUsers, setCurrentUser, clearCurrentUser } from '../../user';
import { outputSuccess, outputError } from '../../utils/output';
import { XhsErrorCode } from '../../shared';
import type { UserCommandOptions } from '../types';

export function registerUserCommand(program: Command): void {
  program
    .command('user')
    .description('Manage users')
    .option('--set-current <name>', 'Set current user')
    .option('--set-default', 'Reset to default user')
    .action(async (options: UserCommandOptions) => {
      try {
        if (options.setCurrent) {
          await setCurrentUser(options.setCurrent);
          outputSuccess(
            { current: options.setCurrent },
            'RELAY:已切换到用户 "' + options.setCurrent + '"'
          );
          return;
        }

        if (options.setDefault) {
          await clearCurrentUser();
          outputSuccess({ current: 'default' }, 'RELAY:已切换到默认用户');
          return;
        }

        const result = await listUsers();
        outputSuccess(result, 'PARSE:users');
      } catch (error) {
        outputFromError(error);
      }
    });
}

function outputFromError(error: unknown): void {
  const message = error instanceof Error ? error.message : String(error);
  outputError(message, XhsErrorCode.BROWSER_ERROR);
}
