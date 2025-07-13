import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import os from 'os';

export interface PlatformTestResult {
  platform: string;
  nodeVersion: string;
  npmVersion: string;
  yarnVersion?: string;
  pnpmVersion?: string;
  dockerVersion?: string;
  availablePackageManagers: string[];
  availableDatabases: string[];
  portAvailability: { [port: number]: boolean };
  fileSystemPermissions: boolean;
  dockerPermissions: boolean;
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class PlatformTester {
  private platform: string;
  private execAsync: (
    // eslint-disable-next-line no-unused-vars
    _cmd: string
  ) => Promise<{ stdout: string; stderr: string }>;

  constructor(
    execAsync: (
      // eslint-disable-next-line no-unused-vars
      _cmd: string
    ) => Promise<{ stdout: string; stderr: string }> = promisify(exec)
  ) {
    this.platform = os.platform();
    this.execAsync = execAsync;
  }

  async runPlatformTests(): Promise<PlatformTestResult> {
    const result: PlatformTestResult = {
      platform: this.platform,
      nodeVersion: '',
      npmVersion: '',
      availablePackageManagers: [],
      availableDatabases: [],
      portAvailability: {},
      fileSystemPermissions: false,
      dockerPermissions: false,
      success: true,
      errors: [],
      warnings: [],
    };

    console.log(
      chalk.blue(`🔍 Running platform tests for ${this.platform}...`)
    );

    try {
      // Test Node.js and package managers
      await this.testNodeAndPackageManagers(result);

      // Test Docker availability
      await this.testDockerAvailability(result);

      // Test port availability
      await this.testPortAvailability(result);

      // Test file system permissions
      await this.testFileSystemPermissions(result);

      // Test database availability
      await this.testDatabaseAvailability(result);

      if (result.success) {
        console.log(chalk.green('✅ Platform tests completed successfully!'));
      } else {
        console.log(chalk.yellow('⚠️  Platform tests completed with issues.'));
      }

      return result;
    } catch (error: unknown) {
      result.success = false;
      result.errors.push(
        `Platform testing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.log(chalk.red('❌ Platform testing failed.'));
      return result;
    }
  }

  private async testNodeAndPackageManagers(
    result: PlatformTestResult
  ): Promise<void> {
    console.log(chalk.blue('📦 Testing Node.js and package managers...'));

    try {
      // Test Node.js
      const { stdout: nodeVersion } = await this.execAsync('node --version');
      result.nodeVersion = nodeVersion.trim();
      console.log(chalk.green(`✅ Node.js ${result.nodeVersion}`));

      // Test npm
      const { stdout: npmVersion } = await this.execAsync('npm --version');
      result.npmVersion = npmVersion.trim();
      result.availablePackageManagers.push('npm');
      console.log(chalk.green(`✅ npm ${result.npmVersion}`));

      // Test yarn
      try {
        const { stdout: yarnVersion } = await this.execAsync('yarn --version');
        result.yarnVersion = yarnVersion.trim();
        result.availablePackageManagers.push('yarn');
        console.log(chalk.green(`✅ yarn ${result.yarnVersion}`));
      } catch {
        result.warnings.push('yarn not available');
        console.log(chalk.yellow('⚠️  yarn not available'));
      }

      // Test pnpm
      try {
        const { stdout: pnpmVersion } = await this.execAsync('pnpm --version');
        result.pnpmVersion = pnpmVersion.trim();
        result.availablePackageManagers.push('pnpm');
        console.log(chalk.green(`✅ pnpm ${result.pnpmVersion}`));
      } catch {
        result.warnings.push('pnpm not available');
        console.log(chalk.yellow('⚠️  pnpm not available'));
      }
    } catch (_error: unknown) {
      result.errors.push(
        `Failed to test Node.js/package managers: ${_error instanceof Error ? _error.message : 'Unknown error'}`
      );
      result.success = false;
      throw _error;
    }
  }

  private async testDockerAvailability(
    result: PlatformTestResult
  ): Promise<void> {
    console.log(chalk.blue('🐳 Testing Docker availability...'));

    try {
      const { stdout: dockerVersion } =
        await this.execAsync('docker --version');
      result.dockerVersion = dockerVersion.trim();
      result.dockerPermissions = true;
      console.log(chalk.green(`✅ ${result.dockerVersion}`));
    } catch {
      result.warnings.push('Docker not available or not accessible');
      console.log(chalk.yellow('⚠️  Docker not available or not accessible'));
    }
  }

  private async testPortAvailability(
    result: PlatformTestResult
  ): Promise<void> {
    console.log(chalk.blue('🔌 Testing port availability...'));

    const portsToTest = [3000, 5432, 3306, 27017, 6379];

    for (const port of portsToTest) {
      try {
        const { stdout } = await this.execAsync(
          `lsof -i :${port} 2>/dev/null || echo "free"`
        );
        result.portAvailability[port] = !stdout.includes('LISTEN');

        if (result.portAvailability[port]) {
          console.log(chalk.green(`✅ Port ${port} is available`));
        } else {
          console.log(chalk.yellow(`⚠️  Port ${port} is in use`));
          result.warnings.push(`Port ${port} is in use`);
        }
      } catch {
        result.portAvailability[port] = true;
        console.log(chalk.green(`✅ Port ${port} is available`));
      }
    }
  }

  private async testFileSystemPermissions(
    result: PlatformTestResult
  ): Promise<void> {
    console.log(chalk.blue('📁 Testing file system permissions...'));

    try {
      const testDir = path.join(process.cwd(), '.nestkick-test');
      await fs.ensureDir(testDir);
      await fs.writeFile(path.join(testDir, 'test.txt'), 'test');
      await fs.remove(testDir);
      result.fileSystemPermissions = true;
      console.log(chalk.green('✅ File system permissions OK'));
    } catch (error: unknown) {
      result.errors.push(
        `File system permission test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.success = false;
      console.log(chalk.red('❌ File system permission test failed'));
    }
  }

  private async testDatabaseAvailability(
    result: PlatformTestResult
  ): Promise<void> {
    console.log(chalk.blue('🗄️  Testing database availability...'));

    // Test PostgreSQL
    try {
      await this.execAsync('psql --version');
      result.availableDatabases.push('postgres');
      console.log(chalk.green('✅ PostgreSQL available'));
    } catch {
      console.log(chalk.yellow('⚠️  PostgreSQL not available'));
    }

    // Test MySQL
    try {
      await this.execAsync('mysql --version');
      result.availableDatabases.push('mysql');
      console.log(chalk.green('✅ MySQL available'));
    } catch {
      console.log(chalk.yellow('⚠️  MySQL not available'));
    }

    // Test MongoDB
    try {
      await this.execAsync('mongod --version');
      result.availableDatabases.push('mongodb');
      console.log(chalk.green('✅ MongoDB available'));
    } catch {
      console.log(chalk.yellow('⚠️  MongoDB not available'));
    }

    // SQLite is always available
    result.availableDatabases.push('sqlite');
    console.log(chalk.green('✅ SQLite available'));
  }

  static generateReport(result: PlatformTestResult): string {
    const report = [
      chalk.blue('\n📊 Platform Test Report'),
      chalk.gray('='.repeat(50)),
      `Platform: ${chalk.white(result.platform)}`,
      `Node.js: ${chalk.white(result.nodeVersion)}`,
      `npm: ${chalk.white(result.npmVersion)}`,
    ];

    if (result.yarnVersion) {
      report.push(`yarn: ${chalk.white(result.yarnVersion)}`);
    }
    if (result.pnpmVersion) {
      report.push(`pnpm: ${chalk.white(result.pnpmVersion)}`);
    }
    if (result.dockerVersion) {
      report.push(`Docker: ${chalk.white(result.dockerVersion)}`);
    }

    report.push(
      '',
      chalk.blue('Available Package Managers:'),
      ...result.availablePackageManagers.map(pm => `  - ${chalk.white(pm)}`),
      '',
      chalk.blue('Available Databases:'),
      ...result.availableDatabases.map(db => `  - ${chalk.white(db)}`),
      '',
      chalk.blue('Port Availability:'),
      ...Object.entries(result.portAvailability).map(
        ([port, available]) =>
          `  - Port ${chalk.white(port)}: ${available ? chalk.green('Available') : chalk.red('In Use')}`
      ),
      '',
      chalk.blue('Permissions:'),
      `  - File System: ${result.fileSystemPermissions ? chalk.green('OK') : chalk.red('Failed')}`,
      `  - Docker: ${result.dockerPermissions ? chalk.green('OK') : chalk.yellow('Not Available')}`
    );

    if (result.warnings.length > 0) {
      report.push(
        '',
        chalk.yellow('Warnings:'),
        ...result.warnings.map(warning => `  - ${chalk.yellow(warning)}`)
      );
    }

    if (result.errors.length > 0) {
      report.push(
        '',
        chalk.red('Errors:'),
        ...result.errors.map(error => `  - ${chalk.red(error)}`)
      );
    }

    report.push(
      '',
      chalk.gray('='.repeat(50)),
      `Overall Status: ${result.success ? chalk.green('✅ PASSED') : chalk.red('❌ FAILED')}`
    );

    return report.join('\n');
  }
}
