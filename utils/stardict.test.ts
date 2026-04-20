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

describe('StarDictParser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset stardict internal state if possible, or create a new instance
    // Since it's a singleton export, we might need to rely on the fact that 
    // it loads data only once unless we force it.
    // For testing, we'll mock the fetch responses.
  });

  it('should load and search for a word', async () => {
    const mockIdx = createMockIdx([
      { word: 'apple', offset: 0, size: 5 },
      { word: 'banana', offset: 5, size: 6 },
      { word: 'ගිය', offset: 11, size: 4 },
      { word: 'නො-', offset: 15, size: 3 }
    ]);
    const mockDict = new TextEncoder().encode('fruityellowgonenot').buffer;

    (global.fetch as any).mockImplementation((url: string) => {
      if (url.endsWith('.idx')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockIdx) });
      if (url.endsWith('.dict')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockDict) });
      return Promise.reject('Unknown URL');
    });

    const results = await stardict.searchWords('app');
    expect(results).toHaveLength(1);
    expect(results[0].word).toBe('apple');

    const def = await stardict.getDefinition('apple');
    expect(def).not.toBeNull();
    expect(def![0].homographDefinitions[0]).toBe('fruit');
  });

  it('should handle prefix matches', async () => {
    const resultsSuffix = await stardict.searchWords('ban');
    expect(resultsSuffix).toHaveLength(1);
    expect(resultsSuffix[0].word).toBe('banana');
  });

  it('should handle affix synthesized matches', async () => {
    const parsedResults = await stardict.searchWords('නොගිය');
    expect(parsedResults).toHaveLength(1);
    expect(parsedResults[0].word).toBe('නො- ගිය');

    const defs = await stardict.getDefinition('නො- ගිය');
    expect(defs).toHaveLength(2);
    expect(defs![0].headword).toBe('නො-');
    expect(defs![1].headword).toBe('ගිය');
  });

  it('should handle case insensitivity', async () => {
    const results = await stardict.searchWords('APPLE');
    expect(results).toHaveLength(1);
    expect(results[0].word).toBe('apple');
  });

  it('should return empty array for non-existent word', async () => {
    const results = await stardict.searchWords('cherry');
    expect(results).toHaveLength(0);
  });
});
