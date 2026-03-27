#!/usr/bin/env node
/**
 * xhs-ts CLI Entry Point
 *
 * @module index
 * @description Command-line interface for Xiaohongshu automation
 */

import { Command } from 'commander';
import type {
  CliLoginOptions,
  CliSearchOptions,
  CliPublishOptions,
  CliUserOptions,
  CliLikeOptions,
  CliCollectOptions,
  CliCommentOptions,
  CliFollowOptions,
  CliScrapeNoteOptions,
  CliScrapeUserOptions,
} from './cli/types';
import { executeLogin } from './login';
import { executeSearch } from './search';
import { executePublish } from './publish';
import { executeLike, executeCollect, executeComment, executeFollow } from './interact';
import { executeScrapeNote, executeScrapeUser } from './scrape';
import { ensureMigrated, listUsers, setCurrentUser, clearCurrentUser, resolveUser } from './user';
import { config, debugLog } from './utils/helpers';
import { outputSuccess, outputError } from './utils/output';
import { forceCleanup } from './browser';
import { XhsErrorCode } from './shared';

// ============================================
// Startup: Run Migration
// ============================================

// Ensure multi-user structure exists before any command
await ensureMigrated();

// ============================================
// CLI Setup
// ============================================

const program = new Command();

program.name('xhs').description('Xiaohongshu automation CLI').version('0.0.2');

// ============================================
// User Command
// ============================================

program
  .command('user')
  .description('Manage users')
  .option('--set-current <name>', 'Set current user')
  .option('--set-default', 'Reset to default user')
  .action(async (options: CliUserOptions) => {
    try {
      if (options.setCurrent) {
        await setCurrentUser(options.setCurrent);
        outputSuccess(
          { current: options.setCurrent },
          `RELAY:已切换到用户 "${options.setCurrent}"`
        );
        return;
      }

      if (options.setDefault) {
        await clearCurrentUser();
        outputSuccess({ current: 'default' }, 'RELAY:已切换到默认用户');
        return;
      }

      // Default: list users
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
  .option('--headless', 'Run in headless mode (output QR as JSON)')
  .option('--timeout <ms>', 'Login timeout in milliseconds')
  .option('--user <name>', 'User name for multi-user support')
  .action(async (options: CliLoginOptions) => {
    // CLI args override .env defaults
    const method = options.sms ? 'sms' : options.qr ? 'qr' : config.loginMethod;
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const timeout = options.timeout ? parseInt(options.timeout, 10) : config.loginTimeout;

    debugLog(
      `Login command: method=${method}, headless=${headless}, timeout=${timeout}, user=${user}`
    );

    await executeLogin({
      method,
      headless,
      user,
      timeout,
    });
  });

// ============================================
// Search Command
// ============================================

program
  .command('search <keyword>')
  .description('Search notes by keyword')
  .option('--limit <number>', 'Number of results (default: 10, max: 100)', '10')
  .option('--skip <number>', 'Number of results to skip (default: 0)', '0')
  .option('--sort <type>', 'Sort by: general, time_descending, or hot', 'general')
  .option('--note-type <type>', 'Note type: all, image, or video', 'all')
  .option('--time-range <range>', 'Time range: all, day, week, or month', 'all')
  .option('--scope <scope>', 'Search scope: all or following', 'all')
  .option('--location <location>', 'Location: all, nearby, or city', 'all')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name for multi-user support')
  .action(async (keyword: string, options: CliSearchOptions) => {
    const limit = parseInt(options.limit, 10);
    const skip = options.skip ? parseInt(options.skip, 10) : 0;
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);

    debugLog(
      `Search: keyword="${keyword}", limit=${limit}, skip=${skip}, user=${user}, options=${JSON.stringify(options)}`
    );

    await executeSearch({
      keyword,
      skip,
      limit,
      sort: options.sort,
      noteType: options.noteType,
      timeRange: options.timeRange,
      scope: options.scope,
      location: options.location,
      headless,
      user,
    });
  });

// ============================================
// Publish Command
// ============================================

program
  .command('publish')
  .description('Publish a new note (image or video)')
  .requiredOption('--title <title>', 'Note title (max 20 chars)')
  .requiredOption('--content <content>', 'Note content (max 1000 chars)')
  .requiredOption('--images <paths>', 'Image paths, comma separated (1-9 images)')
  .option('--video <path>', 'Video path (alternative to images, max 500MB)')
  .option('--tags <tags>', 'Tags, comma separated (max 10 tags)')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name for multi-user support')
  .action(async (options: CliPublishOptions) => {
    // Parse media paths
    let mediaPaths: string[] = [];

    if (options.video) {
      mediaPaths = [options.video];
    } else if (options.images) {
      mediaPaths = options.images.split(',').map((p: string) => p.trim());
    }

    // Parse tags
    const tags = options.tags ? options.tags.split(',').map((t: string) => t.trim()) : undefined;

    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);

    debugLog(
      `Publish: title="${options.title}", media=${mediaPaths.length}, tags=${tags?.length || 0}, headless=${headless}`
    );

    await executePublish({
      title: options.title,
      content: options.content,
      mediaPaths,
      tags,
      headless,
      user,
    });
  });

// ============================================
// Like Command
// ============================================

program
  .command('like [urls...]')
  .description('Like one or multiple notes (URLs separated by space)')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name for multi-user support')
  .option('--delay <ms>', 'Delay between likes in milliseconds (default: 2000)', '2000')
  .action(async (urls: string[], options: CliLikeOptions) => {
    if (!urls || urls.length === 0) {
      outputError('请提供至少一个笔记URL', XhsErrorCode.NOT_FOUND);
      process.exit(1);
    }

    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const delayBetweenLikes = options.delay ? parseInt(options.delay, 10) : 2000;

    debugLog(
      'Like: urls=' +
        urls.length +
        ', headless=' +
        headless +
        ', user=' +
        user +
        ', delay=' +
        delayBetweenLikes
    );

    await executeLike({
      urls,
      headless,
      user,
      delayBetweenLikes,
    });
  });

// ============================================
// Collect Command
// ============================================

program
  .command('collect [urls...]')
  .description('Collect (bookmark) one or multiple notes (URLs separated by space)')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name for multi-user support')
  .option('--delay <ms>', 'Delay between collects in milliseconds (default: 2000)', '2000')
  .action(async (urls: string[], options: CliCollectOptions) => {
    if (!urls || urls.length === 0) {
      outputError('请提供至少一个笔记URL', XhsErrorCode.NOT_FOUND);
      process.exit(1);
    }

    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const delayBetweenCollects = options.delay ? parseInt(options.delay, 10) : 2000;

    debugLog(
      'Collect: urls=' +
        urls.length +
        ', headless=' +
        headless +
        ', user=' +
        user +
        ', delay=' +
        delayBetweenCollects
    );

    await executeCollect({
      urls,
      headless,
      user,
      delayBetweenCollects,
    });
  });

// ============================================
// Comment Command
// ============================================

program
  .command('comment <url> <text>')
  .description('Comment on a note')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name for multi-user support')
  .action(async (url: string, text: string, options: CliCommentOptions) => {
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);

    debugLog('Comment: url=' + url + ', text=' + text + ', user=' + user);

    await executeComment({
      url,
      text,
      headless,
      user,
    });
  });

// ============================================
// Follow Command (Placeholder)
// ============================================

program
  .command('follow [urls...]')
  .description('Follow one or multiple users (User profile URLs separated by space)')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name for multi-user support')
  .option('--delay <ms>', 'Delay between follows in milliseconds (default: 2000)', '2000')
  .action(async (urls: string[], options: CliFollowOptions) => {
    if (!urls || urls.length === 0) {
      outputError('请提供至少一个用户主页URL', XhsErrorCode.NOT_FOUND);
      process.exit(1);
    }

    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const delayBetweenFollows = options.delay ? parseInt(options.delay, 10) : 2000;

    debugLog(
      'Follow: urls=' +
        urls.length +
        ', headless=' +
        headless +
        ', user=' +
        user +
        ', delay=' +
        delayBetweenFollows
    );

    await executeFollow({
      urls,
      headless,
      user,
      delayBetweenFollows,
    });
  });

// ============================================
// Scrape Note Command
// ============================================

program
  .command('scrape-note <url>')
  .description('Scrape note details from a note URL')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name for multi-user support')
  .option('--comments', 'Include comments in result (default: false)')
  .option('--max-comments <number>', 'Max comments to include (default: 20, max: 100)', '20')
  .action(async (url: string, options: CliScrapeNoteOptions) => {
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const includeComments = options.comments ?? false;
    const maxComments = options.maxComments ? parseInt(options.maxComments, 10) : 20;

    debugLog(
      'Scrape-note: url=' +
        url +
        ', headless=' +
        headless +
        ', user=' +
        user +
        ', includeComments=' +
        includeComments
    );

    await executeScrapeNote({
      url,
      headless,
      user,
      includeComments,
      maxComments,
    });
  });

// ============================================
// Scrape User Command
// ============================================

program
  .command('scrape-user <url>')
  .description('Scrape user profile from a user profile URL')
  .option('--headless', 'Run in headless mode')
  .option('--user <name>', 'User name for multi-user support')
  .option('--notes', 'Include recent notes in result (default: false)')
  .option('--max-notes <number>', 'Max notes to include (default: 12, max: 50)', '12')
  .action(async (url: string, options: CliScrapeUserOptions) => {
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const user = resolveUser(options.user);
    const includeNotes = options.notes ?? false;
    const maxNotes = options.maxNotes ? parseInt(options.maxNotes, 10) : 12;

    debugLog(
      'Scrape-user: url=' +
        url +
        ', headless=' +
        headless +
        ', user=' +
        user +
        ', includeNotes=' +
        includeNotes
    );

    await executeScrapeUser({
      url,
      headless,
      user,
      includeNotes,
      maxNotes,
    });
  });

// ============================================
// Error Handling
// ============================================

program.exitOverride();

process.on('uncaughtException', async (error) => {
  // Commander throws CommanderError for help/version display - these are normal, not errors
  if (error instanceof Error && 'code' in error) {
    const commanderError = error as Error & { code: string; exitCode?: number };
    const normalCodes = ['commander.help', 'commander.version', 'commander.helpDisplayed'];
    if (normalCodes.includes(commanderError.code)) {
      // Normal help/version display - exit cleanly
      process.exit(commanderError.exitCode ?? 0);
    }
  }

  debugLog('Uncaught exception:', error);
  outputError(
    error.message || 'Unknown error',
    XhsErrorCode.BROWSER_ERROR,
    config.debug ? error.stack : undefined
  );
  await forceCleanup();
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  debugLog('Unhandled rejection:', reason);
  outputError(String(reason), XhsErrorCode.BROWSER_ERROR);
  await forceCleanup();
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
