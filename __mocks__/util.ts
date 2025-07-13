import { vi } from 'vitest';

// Global mock registry for exec operations
const mockRegistry = new Map<string, any>();

// Create a mock exec function that can be controlled by tests
export const createMockExec = () => {
  const mockExec = vi.fn();
  mockRegistry.set('exec', mockExec);
  return mockExec;
};

// Get the current mock exec function
export const getMockExec = () => {
  return mockRegistry.get('exec') || createMockExec();
};

// Reset all mocks
export const resetMocks = () => {
  mockRegistry.clear();
};

// Mock promisify function that returns our controlled mock
export const promisify = vi.fn((fn: any) => {
  if (fn === require('child_process').exec) {
    return getMockExec();
  }
  // For other functions, return a generic promisified mock
  return vi.fn();
});

// Export the default module
export default {
  promisify,
  createMockExec,
  getMockExec,
  resetMocks,
};
