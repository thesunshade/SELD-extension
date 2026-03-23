import { describe, it, expect, vi, beforeEach } from 'vitest';
import { stardict } from './stardict';

// Helper to create a mock .idx buffer
function createMockIdx(entries: { word: string; offset: number; size: number }[]) {
  const encoder = new TextEncoder();
  const buffers = entries.map(e => {
    const wordBuf = encoder.encode(e.word);
    const buf = new ArrayBuffer(wordBuf.length + 1 + 8);
    const view = new DataView(buf);
    new Uint8Array(buf).set(wordBuf);
    view.setUint32(wordBuf.length + 1, e.offset, false);
    view.setUint32(wordBuf.length + 5, e.size, false);
    return buf;
  });

  const totalLength = buffers.reduce((acc, b) => acc + b.byteLength, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    result.set(new Uint8Array(b), offset);
    offset += b.byteLength;
  }
  return result.buffer;
}

describe('StarDictParser Fuzzy Search', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Resetting singleton state for each test to allow different mock data
    (stardict as any).isLoaded = false;
    (stardict as any).loadPromise = null;
    (stardict as any).indexList = [];
  });

  it('should find words ignoring vowel modifiers (පියඹනවා -> පියාඹනවා)', async () => {
    const mockIdx = createMockIdx([
      { word: 'පියාඹනවා', offset: 0, size: 10 }
    ]);
    const mockDict = new TextEncoder().encode('to fly').buffer;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('.idx')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockIdx) });
      if (url.endsWith('.dict')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockDict) });
      return Promise.reject('Unknown URL');
    });

    const results = await stardict.searchWords('පියඹනවා');
    expect(results).toHaveLength(1);
    expect(results[0].word).toBe('පියාඹනවා');
  });

  it('should find words with interchangeable consonants (උන -> උණ)', async () => {
    const mockIdx = createMockIdx([
      { word: 'උණ', offset: 0, size: 5 }
    ]);
    const mockDict = new TextEncoder().encode('fever').buffer;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('.idx')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockIdx) });
      if (url.endsWith('.dict')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockDict) });
      return Promise.reject('Unknown URL');
    });

    const results = await stardict.searchWords('උන');
    expect(results).toHaveLength(1);
    expect(results[0].word).toBe('උණ');
  });

  it('should rank පැසෙනවා before පසනවා when searching for පසෙනවා', async () => {
    const mockIdx = createMockIdx([
      { word: 'පැසෙනවා', offset: 0, size: 10 },
      { word: 'පසනවා', offset: 10, size: 10 }
    ]);
    const mockDict = new TextEncoder().encode('dist1dist2').buffer;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('.idx')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockIdx) });
      if (url.endsWith('.dict')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockDict) });
      return Promise.reject('Unknown URL');
    });

    const results = await stardict.searchWords('පසෙනවා');
    expect(results).toHaveLength(2);
    expect(results[0].word).toBe('පැසෙනවා');
    expect(results[1].word).toBe('පසනවා');
  });

  it('should find කඩලා when searching for කඩොලා', async () => {
    (stardict as any).isLoaded = false;
    (stardict as any).loadPromise = null;
    (stardict as any).indexList = [];

    const mockIdx = createMockIdx([
      { word: 'කඩලා', offset: 0, size: 10 }
    ]);
    const mockDict = new TextEncoder().encode('data').buffer;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('.idx')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockIdx) });
      if (url.endsWith('.dict')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockDict) });
      return Promise.reject('Unknown URL');
    });

    const results = await stardict.searchWords('කඩොලා');
    expect(results).toHaveLength(1);
    expect(results[0].word).toBe('කඩලා');
  });

  it('should find පීරනවා when searching for පීරන් (normalized prefix match)', async () => {
    const mockIdx = createMockIdx([
      { word: 'පීරනවා', offset: 0, size: 10 }
    ]);
    const mockDict = new TextEncoder().encode('data').buffer;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('.idx')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockIdx) });
      if (url.endsWith('.dict')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockDict) });
      return Promise.reject('Unknown URL');
    });

    const results = await stardict.searchWords('පීරන්');
    expect(results).toHaveLength(1);
    expect(results[0].word).toBe('පීරනවා');
  });
});
