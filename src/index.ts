#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import { setupCommand } from './commands/setup.js';
import { createCommand } from './commands/create.js';
import { cacheCommand } from './commands/cache.js';
import { testPlatformCommand } from './commands/test-platform.js';

const VERSION = '1.0.0';

// Display ASCII art logo
console.log(
  chalk.cyan(
    figlet.textSync('Nestkick', {
      font: 'Standard',
      horizontalLayout: 'default',
      verticalLayout: 'default',
    })
  )
);

console.log(chalk.blue('🚀 Kickstart your NestJS projects with style\n'));

const program = new Command();

program
  .name('nestkick')
  .description(
    'A powerful CLI tool that scaffolds production-ready NestJS applications'
  )
  .version(VERSION, '-v, --version')
  .addCommand(setupCommand)
  .addCommand(createCommand)
  .addCommand(cacheCommand)
  .addCommand(testPlatformCommand);

// Handle errors gracefully
program.exitOverride();

try {
  await program.parseAsync();
} catch (err) {
  if (err instanceof Error) {
    console.error(chalk.red('Error:'), err.message);
  } else {
    console.error(chalk.red('An unexpected error occurred'));
  }
  process.exit(1);
}
