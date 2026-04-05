/**
 * CLI Command Registration
 *
 * @module cli/commands
 * @description Registers all CLI commands with Commander program
 */

import type { Command } from 'commander';
import { registerUserCommand } from './commands/user.command';
import { registerLoginCommand } from './commands/login.command';
import { registerSearchCommand } from './commands/search.command';
import { registerPublishCommand } from './commands/publish.command';
import { registerInteractCommands } from './commands/interact.command';
import { registerScrapeCommands } from './commands/scrape.command';
import { registerBrowserCommand } from './commands/browser.command';

/**
 * Register all CLI commands on a Commander program
 */
export function registerAllCommands(program: Command): void {
  registerUserCommand(program);
  registerLoginCommand(program);
  registerSearchCommand(program);
  registerPublishCommand(program);
  registerInteractCommands(program);
  registerScrapeCommands(program);
  registerBrowserCommand(program);
}
