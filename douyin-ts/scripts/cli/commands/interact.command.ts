/**
 * Interact commands (like, collect, follow)
 *
 * @module cli/commands/interact.command
 */

import type { Command } from 'commander';
import type { CliLikeOptions, CliCollectOptions, CliFollowOptions } from '../types';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { executeLike, executeCollect, executeFollow } from '../../actions/interact';
import { outputError } from '../../core/utils/output';
import { DouyinErrorCode } from '../../core/error';

/**
 * Register interact commands
 */
export function registerInteractCommands(program: Command): void {
  // Like Command
  program
    .command('like <urls...>')
    .description('点赞视频')
    .option('--headless', '无头模式')
    .option('--user <name>', '用户名')
    .option('--delay <ms>', '批量操作间隔')
    .action(async (urls: string[], options: CliLikeOptions) => {
      if (!urls || urls.length === 0) {
        outputError('请提供至少一个视频URL', DouyinErrorCode.NOT_FOUND);
        process.exit(1);
      }
      const headless = options.headless !== undefined ? options.headless : config.headless;
      const user = resolveUser(options.user);
      const delayBetweenLikes = options.delay ? parseInt(options.delay, 10) : 2000;
      await executeLike({ urls, headless, user, delayBetweenLikes });
    });

  // Collect Command
  program
    .command('collect <urls...>')
    .description('收藏视频')
    .option('--headless', '无头模式')
    .option('--user <name>', '用户名')
    .option('--delay <ms>', '批量操作间隔')
    .action(async (urls: string[], options: CliCollectOptions) => {
      if (!urls || urls.length === 0) {
        outputError('请提供至少一个视频URL', DouyinErrorCode.NOT_FOUND);
        process.exit(1);
      }
      const headless = options.headless !== undefined ? options.headless : config.headless;
      const user = resolveUser(options.user);
      const delayBetweenCollects = options.delay ? parseInt(options.delay, 10) : 2000;
      await executeCollect({ urls, headless, user, delayBetweenCollects });
    });

  // Follow Command
  program
    .command('follow <urls...>')
    .description('关注用户')
    .option('--headless', '无头模式')
    .option('--user <name>', '用户名')
    .option('--delay <ms>', '批量操作间隔')
    .action(async (urls: string[], options: CliFollowOptions) => {
      if (!urls || urls.length === 0) {
        outputError('请提供至少一个用户URL', DouyinErrorCode.NOT_FOUND);
        process.exit(1);
      }
      const headless = options.headless !== undefined ? options.headless : config.headless;
      const user = resolveUser(options.user);
      const delayBetweenFollows = options.delay ? parseInt(options.delay, 10) : 2000;
      await executeFollow({ urls, headless, user, delayBetweenFollows });
    });
}