import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';

export interface RollbackInfo {
  projectPath: string;
  createdFiles: string[];
  createdDirs: string[];
  timestamp: Date;
}

export class ErrorHandler {
  protected rollbackStack: RollbackInfo[] = [];

  async addRollbackPoint(projectPath: string): Promise<void> {
    const rollbackInfo: RollbackInfo = {
      projectPath,
      createdFiles: [],
      createdDirs: [],
      timestamp: new Date(),
    };
    this.rollbackStack.push(rollbackInfo);
  }

  async trackCreatedFile(filePath: string): Promise<void> {
    if (this.rollbackStack.length > 0) {
      const currentRollback = this.rollbackStack[this.rollbackStack.length - 1];
      if (currentRollback) {
        currentRollback.createdFiles.push(filePath);
      }
    }
  }

  async trackCreatedDir(dirPath: string): Promise<void> {
    if (this.rollbackStack.length > 0) {
      const currentRollback = this.rollbackStack[this.rollbackStack.length - 1];
      if (currentRollback) {
        currentRollback.createdDirs.push(dirPath);
      }
    }
  }

  async handleError(error: Error): Promise<void> {
    console.error(chalk.red('❌ Error:'), error.message);

    if (error.stack) {
      console.error(chalk.gray('Stack trace:'));
      console.error(chalk.gray(error.stack));
    }

    // Perform rollback if needed
    await this.performRollback();

    // Provide helpful error messages
    this.provideErrorGuidance(error);
  }

  private async performRollback(): Promise<void> {
    if (this.rollbackStack.length === 0) {
      return;
    }

    console.log(chalk.yellow('🔄 Performing rollback...'));

    for (const rollbackInfo of this.rollbackStack.reverse()) {
      try {
        // Remove created files
        for (const filePath of rollbackInfo.createdFiles) {
          if (await fs.pathExists(filePath)) {
            await fs.remove(filePath);
            console.log(
              chalk.gray(
                `   Removed file: ${path.relative(process.cwd(), filePath)}`
              )
            );
          }
        }

        // Remove created directories (in reverse order to handle nested dirs)
        for (const dirPath of rollbackInfo.createdDirs.reverse()) {
          if (await fs.pathExists(dirPath)) {
            await fs.remove(dirPath);
            console.log(
              chalk.gray(
                `   Removed directory: ${path.relative(process.cwd(), dirPath)}`
              )
            );
          }
        }

        // Remove project directory if it's empty
        if (await fs.pathExists(rollbackInfo.projectPath)) {
          const contents = await fs.readdir(rollbackInfo.projectPath);
          if (contents.length === 0) {
            await fs.remove(rollbackInfo.projectPath);
            console.log(
              chalk.gray(
                `   Removed empty project directory: ${path.relative(process.cwd(), rollbackInfo.projectPath)}`
              )
            );
          }
        }
      } catch (rollbackError) {
        console.error(
          chalk.red('   Rollback failed for some items:'),
          rollbackError instanceof Error
            ? rollbackError.message
            : 'Unknown error'
        );
      }
    }

    this.rollbackStack = [];
    console.log(chalk.green('✅ Rollback completed'));
  }

  private provideErrorGuidance(error: Error): void {
    console.log(chalk.blue('\n💡 Troubleshooting Tips:'));

    const errorMessage = error.message.toLowerCase();

    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('eacces')
    ) {
      console.log(
        chalk.yellow('   • Check file permissions in the target directory')
      );
      console.log(
        chalk.yellow('   • Try running with elevated privileges if needed')
      );
    } else if (
      errorMessage.includes('network') ||
      errorMessage.includes('connection')
    ) {
      console.log(chalk.yellow('   • Check your internet connection'));
      console.log(chalk.yellow('   • Verify npm registry accessibility'));
    } else if (
      errorMessage.includes('template') ||
      errorMessage.includes('not found')
    ) {
      // Special case for service not found
      if (
        errorMessage.includes('service') &&
        errorMessage.includes('not found')
      ) {
        console.log(
          chalk.yellow(
            '   • The required service (e.g., postgresql, mysql) was not found on your system.'
          )
        );
        console.log(
          chalk.yellow(
            '   • Make sure the service is installed and running, or choose a different database option.'
          )
        );
        console.log(chalk.yellow('   • On macOS, try: brew services list'));
        console.log(
          chalk.yellow(
            '   • On Linux, try: systemctl list-units --type=service | grep -i <service>'
          )
        );
      } else {
        console.log(chalk.yellow('   • Verify template files are present'));
        console.log(chalk.yellow('   • Check template syntax and variables'));
      }
    } else if (errorMessage.includes('validation')) {
      console.log(chalk.yellow('   • Review your input parameters'));
      console.log(
        chalk.yellow(
          '   • Check project name format (alphanumeric, hyphens, underscores)'
        )
      );
    } else if (
      errorMessage.includes('npm err! registry') ||
      errorMessage.includes('npm registry')
    ) {
      console.log(chalk.yellow('   • Verify npm registry accessibility'));
      console.log(chalk.yellow('   • Try running: npm config get registry'));
      console.log(
        chalk.yellow('   • If using a proxy, check your proxy settings')
      );
    } else if (
      errorMessage.includes('enospc') ||
      errorMessage.includes('no space left')
    ) {
      console.log(
        chalk.yellow('   • Ensure sufficient disk space is available')
      );
    } else {
      console.log(
        chalk.yellow('   • Check the error message above for specific issues')
      );
      console.log(
        chalk.yellow('   • Verify all required dependencies are installed')
      );
      console.log(
        chalk.yellow('   • Ensure sufficient disk space is available')
      );
    }

    console.log(chalk.blue('\n📖 For more help:'));
    console.log(
      chalk.gray('   • Check the documentation: https://docs.nestkick.dev')
    );
    console.log(
      chalk.gray(
        '   • Report issues: https://github.com/username/nestkick/issues'
      )
    );
  }

  async cleanup(): Promise<void> {
    this.rollbackStack = [];
  }

  getRollbackStack(): RollbackInfo[] {
    return [...this.rollbackStack];
  }
}

export const errorHandler = new ErrorHandler();
