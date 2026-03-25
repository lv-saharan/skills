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
} from './cli/types';
import { executeLogin } from './login';
import { executeSearch } from './search';
import { executePublish } from './publish';
import { ensureMigrated, listUsers, setCurrentUser, clearCurrentUser, resolveUser } from './user';
import { config, debugLog } from './utils/helpers';
import { outputSuccess, outputError } from './utils/output';
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

    debugLog(`Login command: method=${method}, headless=${headless}, timeout=${timeout}, user=${user}`);

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
// Like Command (Placeholder)
// ============================================

program
  .command('like <url>')
  .description('Like a note')
  .action(async (_url) => {
    outputError('Like command not implemented yet', XhsErrorCode.NOT_FOUND);
    process.exit(1);
  });

// ============================================
// Collect Command (Placeholder)
// ============================================

program
  .command('collect <url>')
  .description('Collect a note')
  .action(async (_url) => {
    outputError('Collect command not implemented yet', XhsErrorCode.NOT_FOUND);
    process.exit(1);
  });

// ============================================
// Comment Command (Placeholder)
// ============================================

program
  .command('comment <url> <text>')
  .description('Comment on a note')
  .action(async (_url, _text) => {
    outputError('Comment command not implemented yet', XhsErrorCode.NOT_FOUND);
    process.exit(1);
  });

// ============================================
// Follow Command (Placeholder)
// ============================================

program
  .command('follow <url>')
  .description('Follow a user')
  .action(async (_url) => {
    outputError('Follow command not implemented yet', XhsErrorCode.NOT_FOUND);
    process.exit(1);
  });

// ============================================
// Scrape Command (Placeholder)
// ============================================

program
  .command('scrape-note <url>')
  .description('Scrape note details')
  .action(async (_url) => {
    outputError('Scrape-note command not implemented yet', XhsErrorCode.NOT_FOUND);
    process.exit(1);
  });

program
  .command('scrape-user <url>')
  .description('Scrape user profile')
  .action(async (_url) => {
    outputError('Scrape-user command not implemented yet', XhsErrorCode.NOT_FOUND);
    process.exit(1);
  });

// ============================================
// Error Handling
// ============================================

program.exitOverride();

process.on('uncaughtException', (error) => {
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
