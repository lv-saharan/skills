/**
 * Browser Command Registration
 *
 * @module cli/commands/browser.command
 * @description Registers browser command, delegates to browser/commands.ts handlers
 */

import type { Command } from 'commander';
import { config } from '../../config';
import { resolveHeadless } from '../types';
import { handleBrowserCommand } from '../../core/browser/commands';
import type { BrowserCommandOptions as CliBrowserOptions } from '../types';

export function registerBrowserCommand(program: Command): void {
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
    .action(async (options: CliBrowserOptions) => {
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
}
