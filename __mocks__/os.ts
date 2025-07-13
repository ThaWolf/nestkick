import { vi } from 'vitest';

// Default platform for tests (can be overridden)
let mockPlatform = 'darwin';

// Set the platform for testing
export const setPlatform = (platform: string) => {
  mockPlatform = platform;
};

// Mock platform function
export const platform = vi.fn(() => mockPlatform);

// Export the default module
export default {
  platform,
  setPlatform,
};
