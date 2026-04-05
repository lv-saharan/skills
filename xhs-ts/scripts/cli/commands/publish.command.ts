/**
 * Publish Command
 *
 * @module cli/commands/publish.command
 */

import type { Command } from 'commander';
import { resolveUser } from '../../user';
import { config } from '../../config';
import { resolveHeadless } from '../utils';
import type { PublishCommandOptions } from '../types';

export function registerPublishCommand(program: Command): void {
  program
    .command('publish')
    .description('Publish a new note')
    .requiredOption('--title <title>', 'Note title')
    .requiredOption('--content <content>', 'Note content')
    .option('--images <paths>', 'Image paths (comma separated)')
    .option('--video <path>', 'Video path')
    .option('--tags <tags>', 'Tags (comma separated)')
    .option('--headless', 'Run in headless mode')
    .option('--user <name>', 'User name')
    .action(async (options: PublishCommandOptions) => {
      const { executePublish } = await import('../../actions/publish');
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
}
