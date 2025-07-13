import chalk from 'chalk';
import ora from 'ora';
import type { Ora } from 'ora';

export interface ProgressStep {
  name: string;
  action: () => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
}

export class ProgressIndicator {
  private spinner: Ora | null = null;
  private currentStep = 0;
  private totalSteps = 0;

  async runSteps(steps: ProgressStep[], title: string): Promise<void> {
    this.totalSteps = steps.length;
    this.currentStep = 0;

    console.log(chalk.blue(`\n🚀 ${title}`));
    console.log(chalk.gray(`   ${this.totalSteps} steps to complete\n`));

    for (const step of steps) {
      this.currentStep++;
      await this.runStep(step);
    }

    console.log(chalk.green('\n✅ All steps completed successfully!'));
  }

  private async runStep(step: ProgressStep): Promise<void> {
    const stepNumber = `${this.currentStep}/${this.totalSteps}`;
    const stepText = `${stepNumber} ${step.name}`;

    this.spinner = ora({
      text: stepText,
      color: 'blue',
    }).start();

    try {
      await step.action();

      this.spinner.succeed(step.successMessage || `${step.name} completed`);
    } catch (error) {
      this.spinner.fail(step.errorMessage || `${step.name} failed`);
      throw error;
    }
  }

  updateSpinnerText(text: string): void {
    if (this.spinner) {
      this.spinner.text = text;
    }
  }

  stopSpinner(): void {
    if (this.spinner) {
      this.spinner.stop();
      this.spinner = null;
    }
  }
}

export const progressIndicator = new ProgressIndicator();
