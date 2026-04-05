/**
 * Search Command
 *
 * @module cli/commands/search.command
 */

import type { Command } from 'commander';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { parseNumberOption, resolveHeadless } from '../utils';
import type { SearchCommandOptions } from '../types';

export function registerSearchCommand(program: Command): void {
  program
    .command('search <keyword>')
    .description('Search notes by keyword')
    .option('--limit <number>', 'Number of results', '10')
    .option('--skip <number>', 'Results to skip', '0')
    .option('--sort <type>', 'Sort by: general, time_descending, hot', 'general')
    .option('--note-type <type>', 'Note type: all, image, video', 'all')
    .option('--time-range <range>', 'Time range: all, day, week, month', 'all')
    .option('--scope <scope>', 'Search scope: all, following', 'all')
    .option('--location <location>', 'Location: all, nearby, city', 'all')
    .option('--headless', 'Run in headless mode')
    .option('--user <name>', 'User name')
    .action(async (keyword: string, options: SearchCommandOptions) => {
      const { executeSearch } = await import('../../actions/search');
      await executeSearch({
        keyword,
        skip: parseNumberOption(options.skip, 0),
        limit: parseNumberOption(options.limit, 10),
        sort: options.sort as 'general' | 'time_descending' | 'hot',
        noteType: options.noteType as 'all' | 'image' | 'video',
        timeRange: options.timeRange as 'all' | 'day' | 'week' | 'month',
        scope: options.scope as 'all' | 'following',
        location: options.location as 'all' | 'nearby' | 'city',
        headless: resolveHeadless(options.headless, config.headless),
        user: resolveUser(options.user),
      });
    });
}
