/**
 * Interact Commands (like, collect, comment, follow)
 *
 * @module cli/commands/interact.command
 */

import type { Command } from 'commander';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { outputError } from '../../core/utils/output';
import { XhsErrorCode } from '../../config';
import { parseNumberOption, resolveHeadless } from '../types';
import type {
  LikeCommandOptions,
  CollectCommandOptions,
  CommentCommandOptions,
  FollowCommandOptions,
} from '../types';

export function registerInteractCommands(program: Command): void {
  registerLikeCommand(program);
  registerCollectCommand(program);
  registerCommentCommand(program);
  registerFollowCommand(program);
}

function registerLikeCommand(program: Command): void {
  program
    .command('like [urls...]')
    .description('Like notes')
    .option('--headless', 'Run in headless mode')
    .option('--user <name>', 'User name')
    .option('--delay <ms>', 'Delay between likes', '2000')
    .action(async (urls: string[], options: LikeCommandOptions) => {
      if (!urls?.length) {
        outputError('请提供至少一个笔记 URL', XhsErrorCode.NOT_FOUND);
        process.exit(1);
      }
      const { executeLike } = await import('../../actions/interact');
      await executeLike({
        urls,
        headless: resolveHeadless(options.headless, config.headless),
        user: resolveUser(options.user),
        delayBetweenLikes: parseNumberOption(options.delay, 2000),
      });
    });
}

function registerCollectCommand(program: Command): void {
  program
    .command('collect [urls...]')
    .description('Collect (bookmark) notes')
    .option('--headless', 'Run in headless mode')
    .option('--user <name>', 'User name')
    .option('--delay <ms>', 'Delay between collects', '2000')
    .action(async (urls: string[], options: CollectCommandOptions) => {
      if (!urls?.length) {
        outputError('请提供至少一个笔记 URL', XhsErrorCode.NOT_FOUND);
        process.exit(1);
      }
      const { executeCollect } = await import('../../actions/interact');
      await executeCollect({
        urls,
        headless: resolveHeadless(options.headless, config.headless),
        user: resolveUser(options.user),
        delayBetweenCollects: parseNumberOption(options.delay, 2000),
      });
    });
}

function registerCommentCommand(program: Command): void {
  program
    .command('comment <url> <text>')
    .description('Comment on a note')
    .option('--headless', 'Run in headless mode')
    .option('--user <name>', 'User name')
    .action(async (url: string, text: string, options: CommentCommandOptions) => {
      const { executeComment } = await import('../../actions/interact');
      await executeComment({
        url,
        text,
        headless: resolveHeadless(options.headless, config.headless),
        user: resolveUser(options.user),
      });
    });
}

function registerFollowCommand(program: Command): void {
  program
    .command('follow [urls...]')
    .description('Follow users')
    .option('--headless', 'Run in headless mode')
    .option('--user <name>', 'User name')
    .option('--delay <ms>', 'Delay between follows', '2000')
    .action(async (urls: string[], options: FollowCommandOptions) => {
      if (!urls?.length) {
        outputError('请提供至少一个用户主页 URL', XhsErrorCode.NOT_FOUND);
        process.exit(1);
      }
      const { executeFollow } = await import('../../actions/interact');
      await executeFollow({
        urls,
        headless: resolveHeadless(options.headless, config.headless),
        user: resolveUser(options.user),
        delayBetweenFollows: parseNumberOption(options.delay, 2000),
      });
    });
}
