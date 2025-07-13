import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import type { TemplateData } from '../types/index.js';

const execAsync = promisify(exec);

export interface PostGenerationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

export class PostGenerationManager {
  private projectPath: string;
  private templateData: TemplateData;

  constructor(projectPath: string, templateData: TemplateData) {
    this.projectPath = projectPath;
    this.templateData = templateData;
  }

  async runPostGenerationSteps(): Promise<PostGenerationResult> {
    const result: PostGenerationResult = {
      success: true,
      errors: [],
      warnings: [],
    };

    console.log(chalk.blue('\n🔧 Running post-generation setup...'));

    try {
      // Step 1: Install dependencies
      await this.installDependencies(result);

      // Step 2: Generate Prisma client if using Prisma
      if (this.templateData.orm === 'prisma') {
        await this.generatePrismaClient(result);
      }

      // Step 3: Build the project (optional - skip if it fails)
      try {
        await this.buildProject(result);
      } catch (buildError) {
        result.warnings.push(
          `Build step skipped: ${buildError instanceof Error ? buildError.message : 'Unknown error'}`
        );
        console.log(
          chalk.yellow(
            '⚠️  Build step skipped - you can run build manually later'
          )
        );
      }

      // Step 4: Validate project readiness (skip build validation)
      await this.validateProjectReadiness(result);

      // Consider the setup successful if core steps (install + prisma) worked, even if build failed
      const coreStepsSuccessful =
        result.errors.length === 0 ||
        (result.errors.length === 1 &&
          result.errors[0]?.includes('Failed to build project'));

      if (coreStepsSuccessful) {
        console.log(
          chalk.green('✅ Post-generation setup completed successfully!')
        );
        result.success = true;
      } else {
        console.log(
          chalk.yellow('⚠️  Post-generation completed with some issues.')
        );
      }

      return result;
    } catch (error) {
      result.success = false;
      result.errors.push(
        `Post-generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      console.log(chalk.red('❌ Post-generation setup failed.'));
      return result;
    }
  }

  private async installDependencies(
    result: PostGenerationResult
  ): Promise<void> {
    console.log(chalk.blue('📦 Installing dependencies...'));

    try {
      const installCommand = this.getInstallCommand();
      const { stderr } = await execAsync(installCommand, {
        cwd: this.projectPath,
        timeout: 300000, // 5 minutes timeout
      });

      if (stderr && !stderr.includes('WARN')) {
        result.warnings.push(`Installation warnings: ${stderr}`);
      }

      console.log(chalk.green('✅ Dependencies installed successfully'));
    } catch (error: unknown) {
      result.errors.push(
        `Failed to install dependencies: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.success = false;
      throw error;
    }
  }

  private async generatePrismaClient(
    result: PostGenerationResult
  ): Promise<void> {
    console.log(chalk.blue('🗄️  Generating Prisma client...'));

    try {
      const generateCommand = this.getPrismaGenerateCommand();
      const { stderr } = await execAsync(generateCommand, {
        cwd: this.projectPath,
        timeout: 60000, // 1 minute timeout
      });

      if (stderr && !stderr.includes('WARN')) {
        result.warnings.push(`Prisma generation warnings: ${stderr}`);
      }

      console.log(chalk.green('✅ Prisma client generated successfully'));
    } catch (error: unknown) {
      result.errors.push(
        `Failed to generate Prisma client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.success = false;
      throw error;
    }
  }

  private async buildProject(result: PostGenerationResult): Promise<void> {
    console.log(chalk.blue('🏗️  Building project...'));

    try {
      const buildCommand = this.getBuildCommand();
      const { stderr } = await execAsync(buildCommand, {
        cwd: this.projectPath,
        timeout: 120000, // 2 minutes timeout
      });

      if (stderr && !stderr.includes('WARN')) {
        result.warnings.push(`Build warnings: ${stderr}`);
      }

      console.log(chalk.green('✅ Project built successfully'));
    } catch (error: unknown) {
      result.errors.push(
        `Failed to build project: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      result.success = false;
      throw error;
    }
  }

  private async validateProjectReadiness(
    result: PostGenerationResult
  ): Promise<void> {
    console.log(chalk.blue('🔍 Validating project readiness...'));

    const checks = [
      {
        name: 'package.json',
        path: path.join(this.projectPath, 'package.json'),
      },
    ];

    // Add Prisma-specific checks
    if (this.templateData.orm === 'prisma') {
      checks.push({
        name: 'Prisma schema',
        path: path.join(this.projectPath, 'prisma', 'schema.prisma'),
      });
    }

    for (const check of checks) {
      if (!(await fs.pathExists(check.path))) {
        result.errors.push(`Missing required file: ${check.name}`);
        result.success = false;
      }
    }

    if (result.success) {
      console.log(chalk.green('✅ Project validation passed'));
    } else {
      console.log(chalk.red('❌ Project validation failed'));
    }
  }

  private getInstallCommand(): string {
    switch (this.templateData.packageManager) {
      case 'npm':
        return 'npm install';
      case 'yarn':
        return 'yarn install';
      case 'pnpm':
        return 'pnpm install';
      default:
        return 'npm install';
    }
  }

  private getPrismaGenerateCommand(): string {
    switch (this.templateData.packageManager) {
      case 'npm':
        return 'npm run db:generate';
      case 'yarn':
        return 'yarn db:generate';
      case 'pnpm':
        return 'pnpm db:generate';
      default:
        return 'npm run db:generate';
    }
  }

  private getBuildCommand(): string {
    switch (this.templateData.packageManager) {
      case 'npm':
        return 'npx tsc';
      case 'yarn':
        return 'npx tsc';
      case 'pnpm':
        return 'npx tsc';
      default:
        return 'npx tsc';
    }
  }
}
