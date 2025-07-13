import { describe, it, expect } from 'vitest';
import {
  validateProjectName,
  validateORM,
  validateDatabase,
  validatePackageManager,
} from './validation.js';

describe('validateProjectName', () => {
  it('accepts valid project names', () => {
    expect(validateProjectName('my-api').isValid).toBe(true);
    expect(validateProjectName('nestkick123').isValid).toBe(true);
    expect(validateProjectName('nest-kick').isValid).toBe(true);
  });
  it('rejects empty or invalid names', () => {
    expect(validateProjectName('').isValid).toBe(false);
    expect(validateProjectName('-bad').isValid).toBe(false);
    expect(validateProjectName('bad-').isValid).toBe(false);
    expect(validateProjectName('BadName').isValid).toBe(false);
    expect(validateProjectName('bad_name').isValid).toBe(false);
    expect(validateProjectName('bad name').isValid).toBe(false);
  });
});

describe('validateORM', () => {
  it('accepts valid ORMs', () => {
    expect(validateORM('prisma').isValid).toBe(true);
    expect(validateORM('typeorm').isValid).toBe(true);
    expect(validateORM('sequelize').isValid).toBe(true);
  });
  it('rejects invalid ORMs', () => {
    expect(validateORM('mongoose').isValid).toBe(false);
    expect(validateORM('foo').isValid).toBe(false);
  });
});

describe('validateDatabase', () => {
  it('accepts valid databases', () => {
    expect(validateDatabase('postgres').isValid).toBe(true);
    expect(validateDatabase('mysql').isValid).toBe(true);
    expect(validateDatabase('sqlite').isValid).toBe(true);
    expect(validateDatabase('mongodb').isValid).toBe(true);
  });
  it('rejects invalid databases', () => {
    expect(validateDatabase('oracle').isValid).toBe(false);
    expect(validateDatabase('foo').isValid).toBe(false);
  });
});

describe('validatePackageManager', () => {
  it('accepts valid package managers', () => {
    expect(validatePackageManager('npm').isValid).toBe(true);
    expect(validatePackageManager('yarn').isValid).toBe(true);
    expect(validatePackageManager('pnpm').isValid).toBe(true);
  });
  it('rejects invalid package managers', () => {
    expect(validatePackageManager('foo').isValid).toBe(false);
    expect(validatePackageManager('pip').isValid).toBe(false);
  });
});
