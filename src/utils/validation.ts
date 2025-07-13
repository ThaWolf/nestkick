import { z } from 'zod';

const projectNameSchema = z
  .string()
  .min(1, 'Project name is required')
  .max(50, 'Project name must be less than 50 characters')
  .regex(
    /^[a-z0-9-]+$/,
    'Project name must contain only lowercase letters, numbers, and hyphens'
  )
  .refine(name => !name.startsWith('-') && !name.endsWith('-'), {
    message: 'Project name cannot start or end with a hyphen',
  });

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateProjectName(projectName: string): ValidationResult {
  try {
    projectNameSchema.parse(projectName);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid project name' };
  }
}

export const ormSchema = z.enum(['prisma', 'typeorm', 'sequelize']);
export const databaseSchema = z.enum([
  'postgres',
  'mysql',
  'sqlite',
  'mongodb',
]);
export const packageManagerSchema = z.enum(['npm', 'yarn', 'pnpm']);

export function validateORM(orm: string): ValidationResult {
  try {
    ormSchema.parse(orm);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid ORM selection' };
  }
}

export function validateDatabase(database: string): ValidationResult {
  try {
    databaseSchema.parse(database);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid database selection' };
  }
}

export function validatePackageManager(pm: string): ValidationResult {
  try {
    packageManagerSchema.parse(pm);
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid package manager selection' };
  }
}
