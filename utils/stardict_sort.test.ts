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

describe('StarDictParser Sorting', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    (stardict as any).isLoaded = false;
    (stardict as any).loadPromise = null;
    (stardict as any).indexList = [];
    (stardict as any).suffixes = ['ේ']; 
  });

  it('should rank Exact > Suffix > Fuzzy', async () => {
    // We want to search for 'කලේ'
    // 1. Exact match: 'කලේ'
    // 2. Suffix combo: 'කල -ේ' (from 'කලේ')
    // 3. Fuzzy match: 'කළේ'
    
    const mockIdx = createMockIdx([
      { word: 'කල', offset: 0, size: 2 },
      { word: 'කලේ', offset: 2, size: 3 },
      { word: 'කළේ', offset: 5, size: 3 },
      { word: '-ේ', offset: 8, size: 2 }
    ]);
    const mockDict = new TextEncoder().encode('..').buffer;

    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('.idx')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockIdx) });
      if (url.endsWith('.dict')) return Promise.resolve({ arrayBuffer: () => Promise.resolve(mockDict) });
      return Promise.reject('Unknown URL');
    });

    const results = await stardict.searchWords('කලේ');
    
    // Exact: කලෙ
    // Suffix: කල -ේ (synthesized)
    // Fuzzy: කළේ
    
    const resultWords = results.map(r => r.word);
    
    // The exact word 'කලේ' should be first.
    expect(resultWords[0]).toBe('කලේ');
    
    // The synthesized word 'කල -ේ' should be after exact matches but BEFORE fuzzy matches.
    expect(resultWords.find(w => w === 'කල -ේ')).toBeDefined();
    const suffixIdx = resultWords.indexOf('කල -ේ');
    const fuzzyIdx = resultWords.indexOf('කළේ');
    
    expect(suffixIdx).toBeLessThan(fuzzyIdx);
    expect(suffixIdx).toBeGreaterThan(0); // Should be after 'කලේ'
  });
});
