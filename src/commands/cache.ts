import { Command } from 'commander';
import chalk from 'chalk';
import { templateCache } from '../utils/template-cache.js';

export const cacheCommand = new Command('cache')
  .description('Manage template cache')
  .addCommand(
    new Command('clear')
      .description('Clear all cached templates')
      .action(async () => {
        try {
          console.log(chalk.blue('🗑️ Clearing template cache...'));
          await templateCache.clearCache();
          console.log(chalk.green('✅ Template cache cleared successfully'));
        } catch (error) {
          console.error(
            chalk.red('Failed to clear cache:'),
            error instanceof Error ? error.message : 'Unknown error'
          );
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('stats')
      .description('Show cache statistics')
      .action(async () => {
        try {
          console.log(chalk.blue('📊 Template Cache Statistics\n'));
          const stats = await templateCache.getCacheStats();

          console.log(
            chalk.gray('Memory Cache:'),
            chalk.white(`${stats.memoryCacheSize} items`)
          );
          console.log(
            chalk.gray('File Cache:'),
            chalk.white(`${stats.fileCacheSize} items`)
          );
          console.log(
            chalk.gray('Total Size:'),
            chalk.white(`${(stats.totalSize / 1024).toFixed(2)} KB`)
          );

          if (stats.fileCacheSize === 0) {
            console.log(chalk.yellow('\n💡 No cached templates found'));
          }
        } catch (error) {
          console.error(
            chalk.red('Failed to get cache stats:'),
            error instanceof Error ? error.message : 'Unknown error'
          );
          process.exit(1);
        }
      })
  )
  .addCommand(
    new Command('cleanup')
      .description('Clean up old cached templates')
      .option('-a, --age <hours>', 'Maximum age in hours (default: 24)', '24')
      .action(async options => {
        try {
          const maxAge = parseInt(options.age) * 60 * 60 * 1000; // Convert to milliseconds
          console.log(
            chalk.blue(
              `🧹 Cleaning up templates older than ${options.age} hours...`
            )
          );
          await templateCache.cleanupOldCache(maxAge);
          console.log(chalk.green('✅ Cache cleanup completed'));
        } catch (error) {
          console.error(
            chalk.red('Failed to cleanup cache:'),
            error instanceof Error ? error.message : 'Unknown error'
          );
          process.exit(1);
        }
      })
  );
