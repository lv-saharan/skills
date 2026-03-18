#!/usr/bin/env node
/**
 * xhs-ts CLI Entry Point
 *
 * @module index
 * @description Command-line interface for Xiaohongshu automation
 */

import { Command } from 'commander';
import { executeLogin } from './login';
import { config, debugLog } from './utils/helpers';
import { outputError } from './utils/output';
import { XhsErrorCode } from './types';

// ============================================
// CLI Setup
// ============================================

const program = new Command();

program.name('xhs').description('Xiaohongshu automation CLI').version('0.0.1');

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
  .action(async (options) => {
    // CLI args override .env defaults
    const method = options.sms ? 'sms' : (options.qr ? 'qr' : config.loginMethod);
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
// Search Command (Placeholder)
// ============================================

program
  .command('search <keyword>')
  .description('Search notes by keyword')
  .option('--limit <number>', 'Number of results', '20')
  .option('--sort <type>', 'Sort by: hot or time', 'hot')
  .action(async (_keyword, _options) => {
    outputError('Search command not implemented yet', XhsErrorCode.NOT_FOUND);
    process.exit(1);
  });

// ============================================
// Publish Command (Placeholder)
// ============================================

program
  .command('publish')
  .description('Publish a new note')
  .option('--title <title>', 'Note title')
  .option('--content <content>', 'Note content')
  .option('--images <paths>', 'Image paths (comma separated)')
  .option('--video <path>', 'Video path')
  .option('--tags <tags>', 'Tags (comma separated)')
  .action(async (_options) => {
    outputError('Publish command not implemented yet', XhsErrorCode.NOT_FOUND);
    process.exit(1);
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
