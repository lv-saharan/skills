/**
 * User Command
 *
 * @module cli/commands/user.command
 */

import type { Command } from 'commander';
import { listUsers, resolveUser, setCurrentUser, clearCurrentUser } from '../../user';
import { outputSuccess, outputError } from '../../core/utils/output';
import { outputFromError } from '../utils';
import type { UserCommandOptions } from '../types';

export function registerUserCommand(program: Command): void {
  program
    .command('user')
    .description('Manage users')
    .option('--set-current <name>', 'Set current user')
    .option('--set-default', 'Reset to default user')
    .option('--cleanup <name>', 'Clean up corrupted user data')
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

        if (options.cleanup) {
          const { cleanupUserData, canCleanupUserData } = await import('../../user/storage');
          const user = resolveUser(options.cleanup);

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

        const result = await listUsers();
        outputSuccess(result, 'PARSE:users');
      } catch (error) {
        outputFromError(error);
      }
    });
}
