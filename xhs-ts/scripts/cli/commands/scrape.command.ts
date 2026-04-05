/**
 * Scrape Commands (scrape-note, scrape-user)
 *
 * @module cli/commands/scrape.command
 */

import type { Command } from 'commander';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { parseNumberOption, resolveHeadless, resolveBoolFlag } from '../utils';
import type { ScrapeNoteCommandOptions, ScrapeUserCommandOptions } from '../types';

export function registerScrapeCommands(program: Command): void {
  registerScrapeNoteCommand(program);
  registerScrapeUserCommand(program);
}

function registerScrapeNoteCommand(program: Command): void {
  program
    .command('scrape-note <url>')
    .description('Scrape note details')
    .option('--headless', 'Run in headless mode')
    .option('--user <name>', 'User name')
    .option('--comments', 'Include comments')
    .option('--max-comments <number>', 'Max comments', '20')
    .action(async (url: string, options: ScrapeNoteCommandOptions) => {
      const { executeScrapeNote } = await import('../../actions/scrape');
      await executeScrapeNote({
        url,
        headless: resolveHeadless(options.headless, config.headless),
        user: resolveUser(options.user),
        includeComments: resolveBoolFlag(options.comments, false),
        maxComments: parseNumberOption(options.maxComments, 20),
      });
    });
}

function registerScrapeUserCommand(program: Command): void {
  program
    .command('scrape-user <url>')
    .description('Scrape user profile')
    .option('--headless', 'Run in headless mode')
    .option('--user <name>', 'User name')
    .option('--notes', 'Include notes')
    .option('--max-notes <number>', 'Max notes', '12')
    .action(async (url: string, options: ScrapeUserCommandOptions) => {
      const { executeScrapeUser } = await import('../../actions/scrape');
      await executeScrapeUser({
        url,
        headless: resolveHeadless(options.headless, config.headless),
        user: resolveUser(options.user),
        includeNotes: resolveBoolFlag(options.notes, false),
        maxNotes: parseNumberOption(options.maxNotes, 12),
      });
    });
}
