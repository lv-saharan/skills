#!/usr/bin/env node
/**
 * xhs-ts CLI Entry Point
 *
 * @module index
 * @description Command-line interface for Xiaohongshu automation
 */

import { Command } from 'commander';
import { ensureMigrated, listUsers, setCurrentUser, clearCurrentUser, resolveUser } from './user';
import { config, debugLog } from './utils/helpers';
import { outputSuccess, outputError } from './utils/output';
import { XhsErrorCode } from './shared';
import { handleBrowserCommand } from './browser/commands';
import type {
  UserCommandOptions,
  LoginCommandOptions,
  SearchCommandOptions,
  PublishCommandOptions,
  LikeCommandOptions,
  CollectCommandOptions,
  CommentCommandOptions,
  FollowCommandOptions,
  ScrapeNoteCommandOptions,
  ScrapeUserCommandOptions,
  BrowserCommandOptions,
} from './cli/types';
import { parseNumberOption, resolveHeadless, resolveBoolFlag } from './cli/types';

// ============================================
// Startup
// ============================================

await ensureMigrated();

// ============================================
// CLI Setup
// ============================================

const program = new Command();
program.name('xhs').description('Xiaohongshu automation CLI').version('0.1.0');

// ============================================
// User Command
// ============================================

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
      debugLog('User command error:', error);
      outputFromError(error);
    }
  });

// ============================================
// Login Command
// ============================================

program
  .command('login')
  .description('Login to Xiaohongshu and save cookies')
  .option('--qr', 'Use QR code login (default)')
  .option('--sms', 'Use SMS login')
  .option('--headless', 'Run in headless mode')
  .option('--timeout <ms>', 'Login timeout in milliseconds')
  .option('--user <name>', 'User name')
  .action(async (options: LoginCommandOptions) => {
    const { executeLogin } = await import('./login');
    const method = options.sms ? 'sms' : 'qr';
    const timeout = options.timeout ? parseInt(options.timeout, 10) : config.loginTimeout;

    await executeLogin({
      method,
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
      timeout,
    });
  });

// ============================================
// Search Command
// ============================================

program
  .command('search <keyword>')
  .description('Search notes by keyword')
  .option('--limit <number>', 'Number of results', '10')
  .option('--skip <number>', 'Results to skip', '0')
  .option('--sort <type>', 'Sort by: general, time_descending, hot', 'general')
  .option('--note-type <type>', 'Note type: all, image, video', 'all')
  .option('--time-range <range>', 'Time range: all, day, week, month', 'all')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name')
  .action(async (keyword: string, options: SearchCommandOptions) => {
    const { executeSearch } = await import('./search');
    await executeSearch({
      keyword,
      skip: parseNumberOption(options.skip, 0),
      limit: parseNumberOption(options.limit, 10),
      sort: options.sort as 'general' | 'time_descending' | 'hot',
      noteType: options.noteType as 'all' | 'image' | 'video',
      timeRange: options.timeRange as 'all' | 'day' | 'week' | 'month',
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
    });
  });

// ============================================
// Publish Command
// ============================================

program
  .command('publish')
  .description('Publish a new note')
  .requiredOption('--title <title>', 'Note title')
  .requiredOption('--content <content>', 'Note content')
  .requiredOption('--images <paths>', 'Image paths (comma separated)')
  .option('--video <path>', 'Video path')
  .option('--tags <tags>', 'Tags (comma separated)')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name')
  .action(async (options: PublishCommandOptions) => {
    const { executePublish } = await import('./publish');
    const mediaPaths = options.video
      ? [options.video]
      : options.images!.split(',').map((p) => p.trim());
    const tags = options.tags ? options.tags.split(',').map((t) => t.trim()) : undefined;

    await executePublish({
      title: options.title,
      content: options.content,
      mediaPaths,
      tags,
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
    });
  });

// ============================================
// Like Command
// ============================================

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
    const { executeLike } = await import('./interact');
    await executeLike({
      urls,
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
      delayBetweenLikes: parseNumberOption(options.delay, 2000),
    });
  });

// ============================================
// Collect Command
// ============================================

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
    const { executeCollect } = await import('./interact');
    await executeCollect({
      urls,
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
      delayBetweenCollects: parseNumberOption(options.delay, 2000),
    });
  });

// ============================================
// Comment Command
// ============================================

program
  .command('comment <url> <text>')
  .description('Comment on a note')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name')
  .action(async (url: string, text: string, options: CommentCommandOptions) => {
    const { executeComment } = await import('./interact');
    await executeComment({
      url,
      text,
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
    });
  });

// ============================================
// Follow Command
// ============================================

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
    const { executeFollow } = await import('./interact');
    await executeFollow({
      urls,
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
      delayBetweenFollows: parseNumberOption(options.delay, 2000),
    });
  });

// ============================================
// Scrape Note Command
// ============================================

program
  .command('scrape-note <url>')
  .description('Scrape note details')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name')
  .option('--comments', 'Include comments')
  .option('--max-comments <number>', 'Max comments', '20')
  .action(async (url: string, options: ScrapeNoteCommandOptions) => {
    const { executeScrapeNote } = await import('./scrape');
    await executeScrapeNote({
      url,
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
      includeComments: resolveBoolFlag(options.comments, false),
      maxComments: parseNumberOption(options.maxComments, 20),
    });
  });

// ============================================
// Scrape User Command
// ============================================

program
  .command('scrape-user <url>')
  .description('Scrape user profile')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name')
  .option('--notes', 'Include notes')
  .option('--max-notes <number>', 'Max notes', '12')
  .action(async (url: string, options: ScrapeUserCommandOptions) => {
    const { executeScrapeUser } = await import('./scrape');
    await executeScrapeUser({
      url,
      headless: resolveHeadless(options.headless, config.headless),
      user: resolveUser(options.user),
      includeNotes: resolveBoolFlag(options.notes, false),
      maxNotes: parseNumberOption(options.maxNotes, 12),
    });
  });

// ============================================
// Browser Command
// ============================================

program
  .command('browser')
  .description('Manage CDP browser instances')
  .option('--start', 'Start a browser instance')
  .option('--stop', 'Stop all browser instances')
  .option('--stop-user <name>', 'Stop browser for specific user')
  .option('--status', 'Show browser status')
  .option('--list', 'List saved connections')
  .option('--user <name>', 'User name')
  .option('--headless', 'Run in headless mode')
  .action(async (options: BrowserCommandOptions) => {
    await handleBrowserCommand({
      start: options.start,
      stop: options.stop,
      stopUser: options.stopUser,
      status: options.status,
      list: options.list,
      user: options.user,
      headless: resolveHeadless(options.headless, config.headless),
    });
  });

// ============================================
// Error Handling
// ============================================

program.exitOverride();

process.on('uncaughtException', (error) => {
  if (error instanceof Error && 'code' in error) {
    const commanderError = error as Error & { code: string; exitCode?: number };
    const normalCodes = ['commander.help', 'commander.version', 'commander.helpDisplayed'];
    if (normalCodes.includes(commanderError.code)) {
      process.exit(commanderError.exitCode ?? 0);
    }
  }

  debugLog('Uncaught exception:', error);
  outputError(error.message || 'Unknown error', XhsErrorCode.BROWSER_ERROR);
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  debugLog('Unhandled rejection:', reason);
  outputError(String(reason), XhsErrorCode.BROWSER_ERROR);
  process.exit(1);
});

// ============================================
// Helper
// ============================================

function outputFromError(error: unknown): void {
  if (error instanceof Error) {
    outputError(error.message, XhsErrorCode.BROWSER_ERROR);
  } else {
    outputError(String(error), XhsErrorCode.BROWSER_ERROR);
  }
}

// ============================================
// Run CLI
// ============================================

program.parse();
