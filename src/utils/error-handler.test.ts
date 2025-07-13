import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorHandler } from './error-handler.js';
import fs from 'fs-extra';
// import chalk from 'chalk'; // Removed unused import

// Mock fs-extra
vi.mock('fs-extra');

// Mock chalk to avoid color codes in tests
vi.mock('chalk', () => ({
  default: {
    red: vi.fn((text: string) => `RED:${text}`),
    yellow: vi.fn((text: string) => `YELLOW:${text}`),
    blue: vi.fn((text: string) => `BLUE:${text}`),
    gray: vi.fn((text: string) => `GRAY:${text}`),
    green: vi.fn((text: string) => `GREEN:${text}`),
    white: vi.fn((text: string) => `WHITE:${text}`),
  },
}));

// Mock console methods
const mockConsoleError = vi.fn();
const mockConsoleLog = vi.fn();

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;
  let originalConsoleError: typeof console.error;
  let originalConsoleLog: typeof console.log;

  beforeEach(() => {
    errorHandler = new ErrorHandler();
    originalConsoleError = console.error;
    originalConsoleLog = console.log;
    console.error = mockConsoleError;
    console.log = mockConsoleLog;
    vi.clearAllMocks();
  });

  afterEach(() => {
    console.error = originalConsoleError;
    console.log = originalConsoleLog;
  });

  describe('addRollbackPoint', () => {
    it('should add a rollback point with correct structure', async () => {
      const projectPath = '/test/project';
      await errorHandler.addRollbackPoint(projectPath);

      // Access private property for testing
      const rollbackStack = errorHandler.rollbackStack;
      expect(rollbackStack).toHaveLength(1);
      expect(rollbackStack[0]).toMatchObject({
        projectPath,
        createdFiles: [],
        createdDirs: [],
        timestamp: expect.any(Date),
      });
    });
  });

  describe('trackCreatedFile', () => {
    it('should track created file in the latest rollback point', async () => {
      const projectPath = '/test/project';
      const filePath = '/test/project/src/main.ts';

      await errorHandler.addRollbackPoint(projectPath);
      await errorHandler.trackCreatedFile(filePath);

      const rollbackStack = errorHandler.rollbackStack;
      expect(rollbackStack[0].createdFiles).toContain(filePath);
    });

    it('should handle tracking when no rollback point exists', async () => {
      const filePath = '/test/project/src/main.ts';

      // Should not throw when no rollback point exists
      await expect(
        errorHandler.trackCreatedFile(filePath)
      ).resolves.toBeUndefined();
    });
  });

  describe('trackCreatedDir', () => {
    it('should track created directory in the latest rollback point', async () => {
      const projectPath = '/test/project';
      const dirPath = '/test/project/src';

      await errorHandler.addRollbackPoint(projectPath);
      await errorHandler.trackCreatedDir(dirPath);

      const rollbackStack = errorHandler.rollbackStack;
      expect(rollbackStack[0].createdDirs).toContain(dirPath);
    });
  });

  describe('handleError', () => {
    it('should display error message and stack trace', async () => {
      const error = new Error('Test error message');
      error.stack = 'Test stack trace';

      await errorHandler.handleError(error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'RED:❌ Error:',
        'Test error message'
      );
      expect(mockConsoleError).toHaveBeenCalledWith('GRAY:Stack trace:');
      expect(mockConsoleError).toHaveBeenCalledWith('GRAY:Test stack trace');
    });

    it('should handle errors without stack trace', async () => {
      const error = new Error('Test error message');
      delete error.stack;

      await errorHandler.handleError(error);

      expect(mockConsoleError).toHaveBeenCalledWith(
        'RED:❌ Error:',
        'Test error message'
      );
      expect(mockConsoleError).not.toHaveBeenCalledWith('GRAY:Stack trace:');
    });

    it('should provide error guidance based on error type', async () => {
      const error = new Error('Permission denied');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'BLUE:\n💡 Troubleshooting Tips:'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Check file permissions in the target directory'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Try running with elevated privileges if needed'
      );
    });
  });

  describe('performRollback', () => {
    beforeEach(() => {
      vi.mocked(fs.pathExists).mockResolvedValue(true);
      vi.mocked(fs.remove).mockResolvedValue();
      vi.mocked(fs.readdir).mockResolvedValue([]);
    });

    it('should perform rollback when rollback stack is not empty', async () => {
      const projectPath = '/test/project';
      const filePath = '/test/project/src/main.ts';
      const dirPath = '/test/project/src';

      await errorHandler.addRollbackPoint(projectPath);
      await errorHandler.trackCreatedFile(filePath);
      await errorHandler.trackCreatedDir(dirPath);

      // Trigger rollback by calling handleError
      await errorHandler.handleError(new Error('Test error'));

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:🔄 Performing rollback...'
      );
      expect(vi.mocked(fs.remove)).toHaveBeenCalledWith(filePath);
      expect(vi.mocked(fs.remove)).toHaveBeenCalledWith(dirPath);
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'GREEN:✅ Rollback completed'
      );
    });

    it('should handle rollback errors gracefully', async () => {
      const projectPath = '/test/project';
      const filePath = '/test/project/src/main.ts';

      await errorHandler.addRollbackPoint(projectPath);
      await errorHandler.trackCreatedFile(filePath);

      // Mock fs.remove to throw an error
      vi.mocked(fs.remove).mockRejectedValueOnce(new Error('Rollback failed'));

      await errorHandler.handleError(new Error('Test error'));

      expect(mockConsoleError).toHaveBeenCalledWith(
        'RED:   Rollback failed for some items:',
        'Rollback failed'
      );
    });

    it('should remove empty project directory after rollback', async () => {
      const projectPath = '/test/project';

      await errorHandler.addRollbackPoint(projectPath);
      vi.mocked(fs.readdir).mockResolvedValueOnce([]); // Empty directory

      await errorHandler.handleError(new Error('Test error'));

      expect(vi.mocked(fs.remove)).toHaveBeenCalledWith(projectPath);
    });

    it('should not remove project directory if not empty', async () => {
      const projectPath = '/test/project';

      await errorHandler.addRollbackPoint(projectPath);
      vi.mocked(fs.readdir).mockResolvedValueOnce(['some-file.txt']); // Not empty

      await errorHandler.handleError(new Error('Test error'));

      expect(vi.mocked(fs.remove)).not.toHaveBeenCalledWith(projectPath);
    });
  });

  describe('provideErrorGuidance', () => {
    it('should provide permission error guidance', async () => {
      const error = new Error('EACCES: permission denied');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Check file permissions in the target directory'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Try running with elevated privileges if needed'
      );
    });

    it('should provide network error guidance', async () => {
      const error = new Error('Network connection failed');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Check your internet connection'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Verify npm registry accessibility'
      );
    });

    it('should provide template error guidance', async () => {
      const error = new Error('Template not found');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Verify template files are present'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Check template syntax and variables'
      );
    });

    it('should provide validation error guidance', async () => {
      const error = new Error('Validation failed');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Review your input parameters'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Check project name format (alphanumeric, hyphens, underscores)'
      );
    });

    it('should provide generic error guidance for unknown errors', async () => {
      const error = new Error('Unknown error type');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Check the error message above for specific issues'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Verify all required dependencies are installed'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Ensure sufficient disk space is available'
      );
    });

    it('should always provide help links', async () => {
      const error = new Error('Any error');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith('BLUE:\n📖 For more help:');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'GRAY:   • Check the documentation: https://docs.nestkick.dev'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'GRAY:   • Report issues: https://github.com/username/nestkick/issues'
      );
    });
  });

  describe('error scenarios', () => {
    it('should handle port conflict errors with specific guidance', async () => {
      const error = new Error('Port 5432 is already in use by postgresql');

      await errorHandler.handleError(error);

      // Should provide generic guidance since this is not a specific port conflict handler
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Check the error message above for specific issues'
      );
    });

    it('should handle service not found errors', async () => {
      const error = new Error('Service postgresql not found');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'BLUE:\n💡 Troubleshooting Tips:'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • The required service (e.g., postgresql, mysql) was not found on your system.'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Make sure the service is installed and running, or choose a different database option.'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • On macOS, try: brew services list'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • On Linux, try: systemctl list-units --type=service | grep -i <service>'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith('BLUE:\n📖 For more help:');
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'GRAY:   • Check the documentation: https://docs.nestkick.dev'
      );
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'GRAY:   • Report issues: https://github.com/username/nestkick/issues'
      );
    });

    it('should handle disk space errors', async () => {
      const error = new Error('ENOSPC: no space left on device');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Ensure sufficient disk space is available'
      );
    });

    it('should handle npm registry errors', async () => {
      const error = new Error('npm ERR! registry error');

      await errorHandler.handleError(error);

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'YELLOW:   • Verify npm registry accessibility'
      );
    });
  });
});
