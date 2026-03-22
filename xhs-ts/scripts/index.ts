#!/usr/bin/env node
/**
 * xhs-ts CLI Entry Point
 *
 * @module index
 * @description Command-line interface for Xiaohongshu automation
 */

import { Command } from 'commander';
import type { CliLoginOptions, CliSearchOptions, CliPublishOptions } from './cli/types';
import { executeLogin } from './login';
import { executeSearch } from './search';
import { executePublish } from './publish';
import { config, debugLog } from './utils/helpers';
import { outputError } from './utils/output';
import { XhsErrorCode } from './shared';

// ============================================
// CLI Setup
// ============================================

const program = new Command();

program.name('xhs').description('Xiaohongshu automation CLI').version('0.0.2');

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
  .action(async (options: CliLoginOptions) => {
    // CLI args override .env defaults
    const method = options.sms ? 'sms' : options.qr ? 'qr' : config.loginMethod;
    const headless = options.headless !== undefined ? options.headless : config.headless;
    const timeout = options.timeout ? parseInt(options.timeout, 10) : config.loginTimeout;

    debugLog(`Login command: method=${method}, headless=${headless}, timeout=${timeout}`);

    await executeLogin({
      method,
      headless,
      timeout,
    });
  });

// ============================================
// Search Command
// ============================================

program
  .command('search <keyword>')
  .description('Search notes by keyword')
  .option('--limit <number>', 'Number of results', '20')
  .option('--sort <type>', 'Sort by: general, time_descending, or hot', 'general')
  .option('--note-type <type>', 'Note type: all, image, or video', 'all')
  .option('--time-range <range>', 'Time range: all, day, week, or month', 'all')
  .option('--scope <scope>', 'Search scope: all or following', 'all')
  .option('--location <location>', 'Location: all, nearby, or city', 'all')
  .option('--headless', 'Run in headless mode')
  .action(async (keyword: string, options: CliSearchOptions) => {
    const limit = parseInt(options.limit, 10);
    const headless = options.headless !== undefined ? options.headless : config.headless;

    debugLog(`Search: keyword="${keyword}", limit=${limit}, options=${JSON.stringify(options)}`);

    await executeSearch({
      keyword,
      limit,
      sort: options.sort,
      noteType: options.noteType,
      timeRange: options.timeRange,
      scope: options.scope,
      location: options.location,
      headless,
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

    debugLog(
      `Publish: title="${options.title}", media=${mediaPaths.length}, tags=${tags?.length || 0}, headless=${headless}`
    );

    await executePublish({
      title: options.title,
      content: options.content,
      mediaPaths,
      tags,
      headless,
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
// Run CLI
// ============================================

program.parse();
