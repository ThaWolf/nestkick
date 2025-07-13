import { Command } from 'commander';
import chalk from 'chalk';
import { PlatformTester } from '../utils/platform-tester.js';
import { BrandingManager } from '../utils/branding.js';

export const testPlatformCommand = new Command('test-platform')
  .description('Test platform compatibility and available tools')
  .option('-r, --report', 'Generate detailed report only', false)
  .action(async options => {
    try {
      console.log(BrandingManager.getLogo());
      console.log(chalk.blue('🔍 Platform Compatibility Test\n'));

      const tester = new PlatformTester();
      const result = await tester.runPlatformTests();

      if (options.report) {
        console.log(PlatformTester.generateReport(result));
      } else {
        // Show summary
        console.log(chalk.blue('\n📋 Test Summary:'));
        console.log(`Platform: ${chalk.white(result.platform)}`);
        console.log(`Node.js: ${chalk.white(result.nodeVersion)}`);
        console.log(
          `Package Managers: ${chalk.white(result.availablePackageManagers.join(', '))}`
        );
        console.log(
          `Databases: ${chalk.white(result.availableDatabases.join(', '))}`
        );
        console.log(
          `Docker: ${result.dockerVersion ? chalk.green('Available') : chalk.yellow('Not Available')}`
        );
        console.log(
          `File Permissions: ${result.fileSystemPermissions ? chalk.green('OK') : chalk.red('Failed')}`
        );

        if (result.warnings.length > 0) {
          console.log(
            chalk.yellow(`\n⚠️  ${result.warnings.length} warning(s) found`)
          );
        }

        if (result.errors.length > 0) {
          console.log(chalk.red(`\n❌ ${result.errors.length} error(s) found`));
        }

        console.log(
          `\nOverall Status: ${result.success ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED')}`
        );

        if (!options.report) {
          console.log(
            chalk.blue('\n💡 Run with --report for detailed information')
          );
        }
      }

      if (!result.success) {
        process.exit(1);
      }
    } catch (error) {
      console.error(
        chalk.red('Platform testing failed:'),
        error instanceof Error ? error.message : 'Unknown error'
      );
      process.exit(1);
    }
  });
