import { vi } from 'vitest';

// Mock exec function that can be controlled by tests
export const exec = vi.fn();

// Export the default module
export default {
  exec,
};
