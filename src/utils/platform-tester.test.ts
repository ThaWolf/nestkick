import { describe, it, expect, vi, beforeEach, Mock } from 'vitest';

// Only mock fs-extra and os
vi.mock('fs-extra');
vi.mock('os');

import fs from 'fs-extra';
import os from 'os';
import { PlatformTester, PlatformTestResult } from './platform-tester.js';

// Define a local mockExec function for dependency injection
let mockExec: Mock;

describe('PlatformTester', () => {
  let tester: PlatformTester;

  beforeEach(() => {
    vi.clearAllMocks();
    mockExec = vi.fn();
    vi.mocked(os.platform).mockReturnValue('darwin');
    tester = new PlatformTester(mockExec);
  });

  describe('constructor', () => {
    it('should initialize with current platform', () => {
      vi.mocked(os.platform).mockReturnValue('linux');
      new PlatformTester(mockExec);
      expect(os.platform).toHaveBeenCalled();
    });
  });

  describe('runPlatformTests', () => {
    it('should run all platform tests successfully', async () => {
      // Mock successful responses
      mockExec
        .mockResolvedValueOnce({ stdout: 'v18.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        }) // node --version
        .mockResolvedValueOnce({ stdout: '8.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        }) // npm --version
        .mockRejectedValueOnce(new Error('yarn not found')) // yarn --version
        .mockResolvedValueOnce({ stdout: '7.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        }) // pnpm --version
        .mockResolvedValueOnce({
          stdout: 'Docker version 20.0.0\n',
          stderr: '',
        } as { stdout: string; stderr: string }) // docker --version
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        }) // lsof port 3000
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        }) // lsof port 5432
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        }) // lsof port 3306
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        }) // lsof port 27017
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        }) // lsof port 6379
        .mockResolvedValueOnce({
          stdout: 'psql version 13.0\n',
          stderr: '',
        } as { stdout: string; stderr: string }) // psql --version
        .mockRejectedValueOnce(new Error('mysql not found')) // mysql --version
        .mockRejectedValueOnce(new Error('mongod not found')); // mongod --version

      // Mock file system operations
      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const result = await tester.runPlatformTests();

      expect(result.success).toBe(true);
      expect(result.platform).toBe('darwin');
      expect(result.nodeVersion).toBe('v18.0.0');
      expect(result.npmVersion).toBe('8.0.0');
      expect(result.pnpmVersion).toBe('7.0.0');
      expect(result.dockerVersion).toBe('Docker version 20.0.0');
      expect(result.availablePackageManagers).toContain('npm');
      expect(result.availablePackageManagers).toContain('pnpm');
      expect(result.availablePackageManagers).not.toContain('yarn');
      expect(result.availableDatabases).toContain('postgres');
      expect(result.availableDatabases).toContain('sqlite');
      expect(result.fileSystemPermissions).toBe(true);
      expect(result.dockerPermissions).toBe(true);
      expect(result.warnings).toContain('yarn not available');
    });

    it('should handle Node.js/npm failures gracefully', async () => {
      mockExec.mockRejectedValue(new Error('node not found'));

      const result = await tester.runPlatformTests();

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'Failed to test Node.js/package managers: node not found'
      );
    });

    it('should handle file system permission failures', async () => {
      // Mock successful Node.js and package manager tests
      mockExec
        .mockResolvedValueOnce({ stdout: 'v18.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: '8.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('yarn not found'))
        .mockResolvedValueOnce({ stdout: '7.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('docker not found'))
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('psql not found'))
        .mockRejectedValueOnce(new Error('mysql not found'))
        .mockRejectedValueOnce(new Error('mongod not found'));

      // Mock file system failure
      vi.mocked(fs.ensureDir).mockRejectedValue(new Error('Permission denied'));

      const result = await tester.runPlatformTests();

      expect(result.success).toBe(false);
      expect(result.errors).toContain(
        'File system permission test failed: Permission denied'
      );
    });

    it('should detect port conflicts correctly', async () => {
      // Mock successful basic tests
      mockExec
        .mockResolvedValueOnce({ stdout: 'v18.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: '8.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('yarn not found'))
        .mockResolvedValueOnce({ stdout: '7.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('docker not found'))
        .mockResolvedValueOnce({
          stdout: 'node 1234 LISTEN\n',
          stderr: '',
        } as { stdout: string; stderr: string }) // Port 3000 in use
        .mockResolvedValueOnce({
          stdout: 'postgres 5678 LISTEN\n',
          stderr: '',
        } as { stdout: string; stderr: string }) // Port 5432 in use
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('psql not found'))
        .mockRejectedValueOnce(new Error('mysql not found'))
        .mockRejectedValueOnce(new Error('mongod not found'));

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const result = await tester.runPlatformTests();

      expect(result.success).toBe(true);
      expect(result.portAvailability[3000]).toBe(false);
      expect(result.portAvailability[5432]).toBe(false);
      expect(result.portAvailability[3306]).toBe(true);
      expect(result.warnings).toContain('Port 3000 is in use');
      expect(result.warnings).toContain('Port 5432 is in use');
    });
  });

  describe('generateReport', () => {
    it('should generate a comprehensive report', () => {
      const mockResult: PlatformTestResult = {
        platform: 'darwin',
        nodeVersion: 'v18.0.0',
        npmVersion: '8.0.0',
        yarnVersion: '1.22.0',
        pnpmVersion: '7.0.0',
        dockerVersion: 'Docker version 20.0.0',
        availablePackageManagers: ['npm', 'yarn', 'pnpm'],
        availableDatabases: ['postgres', 'mysql', 'sqlite'],
        portAvailability: {
          3000: false,
          5432: false,
          3306: true,
          27017: true,
          6379: true,
        },
        fileSystemPermissions: true,
        dockerPermissions: true,
        success: true,
        errors: [],
        warnings: ['Port 3000 is in use', 'Port 5432 is in use'],
      };

      const report = PlatformTester.generateReport(mockResult);

      expect(report).toContain('Platform: darwin');
      expect(report).toContain('Node.js: v18.0.0');
      expect(report).toContain('npm: 8.0.0');
      expect(report).toContain('yarn: 1.22.0');
      expect(report).toContain('pnpm: 7.0.0');
      expect(report).toContain('Docker: Docker version 20.0.0');
      expect(report).toContain('Available Package Managers:');
      expect(report).toContain('Available Databases:');
      expect(report).toContain('Port Availability:');
      expect(report).toContain('Permissions:');
      expect(report).toContain('Warnings:');
      expect(report).toContain('Overall Status: ✅ PASSED');
    });

    it('should handle missing optional fields', () => {
      const mockResult: PlatformTestResult = {
        platform: 'linux',
        nodeVersion: 'v16.0.0',
        npmVersion: '6.0.0',
        availablePackageManagers: ['npm'],
        availableDatabases: ['sqlite'],
        portAvailability: {},
        fileSystemPermissions: false,
        dockerPermissions: false,
        success: false,
        errors: ['Node.js version too old'],
        warnings: [],
      };

      const report = PlatformTester.generateReport(mockResult);

      expect(report).toContain('Platform: linux');
      expect(report).toContain('Node.js: v16.0.0');
      expect(report).toContain('npm: 6.0.0');
      expect(report).not.toContain('yarn:');
      expect(report).not.toContain('pnpm:');
      expect(report).toContain('Docker: Not Available');
      expect(report).toContain('Errors:');
      expect(report).toContain('Overall Status: ❌ FAILED');
    });
  });

  describe('cross-platform compatibility', () => {
    it('should work on Windows', async () => {
      vi.mocked(os.platform).mockReturnValue('win32');
      const windowsTester = new PlatformTester(mockExec);

      // Mock Windows-specific responses
      mockExec
        .mockResolvedValueOnce({ stdout: 'v18.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: '8.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('yarn not found'))
        .mockResolvedValueOnce({ stdout: '7.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('docker not found'))
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('psql not found'))
        .mockRejectedValueOnce(new Error('mysql not found'))
        .mockRejectedValueOnce(new Error('mongod not found'));

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const result = await windowsTester.runPlatformTests();

      expect(result.platform).toBe('win32');
      expect(result.success).toBe(true);
    });

    it('should work on Linux', async () => {
      vi.mocked(os.platform).mockReturnValue('linux');
      const linuxTester = new PlatformTester(mockExec);

      // Mock Linux-specific responses
      mockExec
        .mockResolvedValueOnce({ stdout: 'v18.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: '8.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('yarn not found'))
        .mockResolvedValueOnce({ stdout: '7.0.0\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('docker not found'))
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockResolvedValueOnce({ stdout: 'free\n', stderr: '' } as {
          stdout: string;
          stderr: string;
        })
        .mockRejectedValueOnce(new Error('psql not found'))
        .mockRejectedValueOnce(new Error('mysql not found'))
        .mockRejectedValueOnce(new Error('mongod not found'));

      vi.mocked(fs.ensureDir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      vi.mocked(fs.remove).mockResolvedValue(undefined);

      const result = await linuxTester.runPlatformTests();

      expect(result.platform).toBe('linux');
      expect(result.success).toBe(true);
    });
  });
});
