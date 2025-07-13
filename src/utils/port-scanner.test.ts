import { describe, it, expect, beforeEach } from 'vitest';
import { PortScanner } from './port-scanner.js';

// Helper to create a PortScanner with injected mocks
function createTestPortScanner({
  execAsync,
  platform,
}: {
  execAsync: (_unused: string) => Promise<{ stdout: string; stderr: string }>;
  platform: string;
}) {
  return new PortScanner({
    execAsync: execAsync,
    platform: platform,
  });
}

describe('PortScanner', () => {
  let execAsyncMock: (
    _unused: string
  ) => Promise<{ stdout: string; stderr: string }>;
  let scanner: PortScanner;

  beforeEach(() => {
    execAsyncMock = async (_unused: string) => {
      // Default: port is available
      return { stdout: '', stderr: '' };
    };
    scanner = createTestPortScanner({
      execAsync: execAsyncMock,
      platform: 'darwin',
    });
  });

  describe('isPortAvailable', () => {
    it('should return true when port is available', async () => {
      execAsyncMock = async (_unused: string) => {
        throw Object.assign(new Error('No such process'), { code: 1 });
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });
      const result = await scanner.isPortAvailable(3000);
      expect(result).toBe(true);
    });

    it('should return false when port is occupied', async () => {
      execAsyncMock = async () => ({
        stdout:
          'COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\nnode    1234 user   12u  IPv6 0x1234567890123456      0t0  TCP *:3000 (LISTEN)',
        stderr: '',
      });
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });
      const result = await scanner.isPortAvailable(3000);
      expect(result).toBe(false);
    });

    it('should handle errors gracefully and assume port is available', async () => {
      execAsyncMock = async () => {
        throw new Error('Permission denied');
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });
      const result = await scanner.isPortAvailable(3000);
      expect(result).toBe(true);
    });
  });

  describe('checkPort', () => {
    it('should return detailed port information when occupied', async () => {
      execAsyncMock = async () => ({
        stdout:
          'COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\npostgres 1234 user   12u  IPv6 0x1234567890123456      0t0  TCP *:5432 (LISTEN)',
        stderr: '',
      });
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });
      const result = await scanner.checkPort(5432);
      expect(result).toEqual({
        port: 5432,
        isOccupied: true,
        process: 'postgres (PID: 1234)',
        service: 'postgresql',
      });
    });

    it('should return available port information when free', async () => {
      execAsyncMock = async () => {
        throw Object.assign(new Error('No such process'), { code: 1 });
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });
      const result = await scanner.checkPort(3000);
      expect(result).toEqual({
        port: 3000,
        isOccupied: false,
      });
    });
  });

  describe('checkPorts', () => {
    it('should check multiple ports simultaneously', async () => {
      // Create a mock that returns different results based on the port
      execAsyncMock = async _unused => {
        if (_unused.includes(':5432')) {
          return {
            stdout:
              'COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\npostgres 1234 user   12u  IPv6 0x1234567890123456      0t0  TCP *:5432 (LISTEN)',
            stderr: '',
          };
        } else if (_unused.includes(':3000')) {
          throw Object.assign(new Error('No such process'), { code: 1 });
        }
        return { stdout: '', stderr: '' };
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const results = await scanner.checkPorts([5432, 3000]);
      expect(results).toHaveLength(2);
      expect(results[0].isOccupied).toBe(true);
      expect(results[1].isOccupied).toBe(false);
    });
  });

  describe('findAvailablePort', () => {
    it('should find the first available port in range', async () => {
      // Create a mock that returns different results based on the port
      execAsyncMock = async _unused => {
        if (_unused.includes(':3000')) {
          return {
            stdout:
              'COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\nnode    1234 user   12u  IPv6 0x1234567890123456      0t0  TCP *:3000 (LISTEN)',
            stderr: '',
          };
        } else if (_unused.includes(':3001')) {
          throw Object.assign(new Error('No such process'), { code: 1 });
        }
        return { stdout: '', stderr: '' };
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const result = await scanner.findAvailablePort(3000, 3001);
      expect(result).toBe(3001);
    });

    it('should throw error when no ports are available', async () => {
      execAsyncMock = async () => ({
        stdout:
          'COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\nnode    1234 user   12u  IPv6 0x1234567890123456      0t0  TCP *:3000 (LISTEN)',
        stderr: '',
      });
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      await expect(scanner.findAvailablePort(3000, 3000)).rejects.toThrow(
        'No available ports found in range 3000-3000'
      );
    });
  });

  describe('detectDatabaseServices', () => {
    it('should detect running PostgreSQL service on macOS', async () => {
      // Create a mock that returns "started" for PostgreSQL service check
      execAsyncMock = async _unused => {
        if (_unused.includes('brew services list | grep postgresql')) {
          return {
            stdout:
              'postgresql@14 started wolf ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist',
            stderr: '',
          };
        }
        throw Object.assign(new Error('Service not found'), { code: 1 });
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const services = await scanner.detectDatabaseServices();
      expect(services).toContainEqual({
        name: 'postgresql',
        isRunning: true,
        port: 5432,
        command: 'brew services stop postgresql',
      });
    });

    it('should detect stopped PostgreSQL service on macOS', async () => {
      // Create a mock that returns "none" for PostgreSQL service check

      execAsyncMock = async _unused => {
        if (_unused.includes('brew services list | grep postgresql')) {
          return {
            stdout:
              'postgresql@14 none wolf ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist',
            stderr: '',
          };
        }
        throw Object.assign(new Error('Service not found'), { code: 1 });
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const services = await scanner.detectDatabaseServices();
      expect(services).toContainEqual({
        name: 'postgresql',
        isRunning: false,
        port: 5432,
        command: 'brew services start postgresql',
      });
    });

    it('should handle service not found gracefully', async () => {
      execAsyncMock = async _unused => {
        throw new Error('Service not found');
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const services = await scanner.detectDatabaseServices();
      expect(services).toEqual([]);
    });
  });

  describe('getCommonDatabasePorts', () => {
    it('should return common database ports', () => {
      const ports = scanner.getCommonDatabasePorts();
      expect(ports).toEqual([5432, 3306, 27017, 6379, 3000]);
    });
  });

  describe('checkDatabasePortConflicts', () => {
    it('should check all common database ports for conflicts', async () => {
      // Create a mock that returns different results based on the port

      execAsyncMock = async _unused => {
        if (_unused.includes(':5432')) {
          return {
            stdout:
              'COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\npostgres 1234 user   12u  IPv6 0x1234567890123456      0t0  TCP *:5432 (LISTEN)',
            stderr: '',
          };
        } else {
          // All other ports are available
          throw Object.assign(new Error('No such process'), { code: 1 });
        }
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const conflicts = await scanner.checkDatabasePortConflicts();
      expect(conflicts).toHaveLength(5);
      expect(conflicts[0].isOccupied).toBe(true); // 5432
      expect(conflicts.slice(1).every(c => !c.isOccupied)).toBe(true); // Others should be free
    });
  });

  describe('getServiceManagementCommands', () => {
    it('should return macOS commands for service management', () => {
      const commands = scanner.getServiceManagementCommands('postgresql');
      expect(commands).toContain('brew services stop postgresql');
      expect(commands).toContain('brew services start postgresql');
      expect(commands).toContain('brew services restart postgresql');
    });
  });

  describe('generatePortConflictMessage', () => {
    it('should generate user-friendly error message for port conflict', () => {
      const portInfo = {
        port: 5432,
        isOccupied: true,
        process: 'postgres (PID: 1234)',
        service: 'postgresql',
      };

      const message = scanner.generatePortConflictMessage(portInfo);
      expect(message).toContain('❌ Port 5432 is already in use');
      expect(message).toContain('Service: postgresql');
      expect(message).toContain('Process: postgres (PID: 1234)');
      expect(message).toContain('💡 Resolution options:');
      expect(message).toContain('brew services stop postgresql');
      expect(message).toContain('nestkick create --db-port 5433');
    });

    it('should handle missing service and process information', () => {
      const portInfo = {
        port: 3000,
        isOccupied: true,
      };

      const message = scanner.generatePortConflictMessage(portInfo);
      expect(message).toContain('❌ Port 3000 is already in use');
      expect(message).toContain('💡 Resolution options:');
    });
  });

  describe('identifyService', () => {
    it('should identify PostgreSQL service', () => {
      const service = scanner.identifyService('postgres', 5432);
      expect(service).toBe('postgresql');
    });

    it('should identify MySQL service', () => {
      const service = scanner.identifyService('mysqld', 3306);
      expect(service).toBe('mysql');
    });

    it('should identify MongoDB service', () => {
      const service = scanner.identifyService('mongod', 27017);
      expect(service).toBe('mongodb');
    });

    it('should identify Redis service', () => {
      const service = scanner.identifyService('redis-server', 6379);
      expect(service).toBe('redis');
    });

    it('should identify application service', () => {
      const service = scanner.identifyService('node', 3000);
      expect(service).toBe('application');
    });

    it('should return unknown for unrecognized service', () => {
      const service = scanner.identifyService('unknown-process', 8080);
      expect(service).toBe('unknown');
    });
  });

  describe('test scenarios', () => {
    it('should handle PostgreSQL port conflict scenario', async () => {
      execAsyncMock = async _unused => {
        if (_unused.includes(':5432')) {
          return {
            stdout:
              'COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\npostgres 1234 user   12u  IPv6 0x1234567890123456      0t0  TCP *:5432 (LISTEN)',
            stderr: '',
          };
        }
        throw Object.assign(new Error('No such process'), { code: 1 });
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const result = await scanner.checkPort(5432);
      expect(result.isOccupied).toBe(true);
      expect(result.service).toBe('postgresql');
    });

    it('should handle MySQL port conflict scenario', async () => {
      execAsyncMock = async _unused => {
        if (_unused.includes(':3306')) {
          return {
            stdout:
              'COMMAND  PID USER   FD   TYPE             DEVICE SIZE/OFF NODE NAME\nmysqld 5678 user   12u  IPv6 0x1234567890123456      0t0  TCP *:3306 (LISTEN)',
            stderr: '',
          };
        }
        throw Object.assign(new Error('No such process'), { code: 1 });
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const result = await scanner.checkPort(3306);
      expect(result.isOccupied).toBe(true);
      expect(result.service).toBe('mysql');
    });

    it('should handle running PostgreSQL service scenario', async () => {
      execAsyncMock = async _unused => {
        if (_unused.includes('brew services list | grep postgresql')) {
          return {
            stdout:
              'postgresql@14 started wolf ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist',
            stderr: '',
          };
        }
        throw Object.assign(new Error('Service not found'), { code: 1 });
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const services = await scanner.detectDatabaseServices();
      const postgresService = services.find(s => s.name === 'postgresql');
      expect(postgresService?.isRunning).toBe(true);
    });

    it('should handle stopped PostgreSQL service scenario', async () => {
      execAsyncMock = async _unused => {
        if (_unused.includes('brew services list | grep postgresql')) {
          return {
            stdout:
              'postgresql@14 none wolf ~/Library/LaunchAgents/homebrew.mxcl.postgresql@14.plist',
            stderr: '',
          };
        }
        throw Object.assign(new Error('Service not found'), { code: 1 });
      };
      scanner = createTestPortScanner({
        execAsync: execAsyncMock,
        platform: 'darwin',
      });

      const services = await scanner.detectDatabaseServices();
      const postgresService = services.find(s => s.name === 'postgresql');
      expect(postgresService?.isRunning).toBe(false);
    });
  });
});
