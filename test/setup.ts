import { vi } from 'vitest';

// Mock chrome API
global.chrome = {
  runtime: {
    getURL: vi.fn((path: string) => `chrome-extension://mock-id${path}`),
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn(),
      },
    },
  },
} as any;

// Mock fetch
global.fetch = vi.fn();

// Mock TextDecoder/Encoder if not available
if (typeof TextDecoder === 'undefined') {
  const { TextDecoder, TextEncoder } = require('util');
  global.TextDecoder = TextDecoder;
  global.TextEncoder = TextEncoder;
}
