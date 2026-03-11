// utils/stardict.ts

export interface DictEntry {
    word: string;
    definition: string;
}

export interface StructuredDefinition {
    headword: string;
    homographDefinitions: string[];
}

export interface IndexEntry {
    word: string;
    offset: number;
    size: number;
    isSynthesizedMatch?: boolean;
    suffixCount?: number;
}

class StarDictParser {
    private idxBuffer: ArrayBuffer | null = null;
    private dictBuffer: ArrayBuffer | null = null;
    private indexList: IndexEntry[] = [];
    private suffixes: string[] = []; // Store suffixes without the leading '-'
    private isLoaded = false;
    private loadPromise: Promise<void> | null = null;

    async load() {
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            if (this.isLoaded) return;
            try {
                // Fetch the binary data from the extension bundle
                const idxResponse = await fetch(chrome.runtime.getURL('/SELD.idx'));
                this.idxBuffer = await idxResponse.arrayBuffer();

                const dictResponse = await fetch(chrome.runtime.getURL('/SELD.dict'));
                this.dictBuffer = await dictResponse.arrayBuffer();

                this.parseIndex();
                this.isLoaded = true;
                console.log('StarDict loaded. Words count:', this.indexList.length);
            } catch (err) {
                console.error('Failed to load StarDict dictionary:', err);
                this.loadPromise = null; // Reset on failure
            }
        })();

        return this.loadPromise;
    }

    private parseIndex() {
        if (!this.idxBuffer) return;
        const view = new DataView(this.idxBuffer);
        const bytes = new Uint8Array(this.idxBuffer);
        const decoder = new TextDecoder('utf-8');

        let i = 0;
        while (i < bytes.length) {
            const start = i;
            while (i < bytes.length && bytes[i] !== 0) {
                i++;
            }
            if (i >= bytes.length) break;

            const wordStr = decoder.decode(bytes.subarray(start, i));
            i++; // skip null byte

            if (i + 8 <= bytes.length) {
                const offset = view.getUint32(i, false); // Big-endian
                const size = view.getUint32(i + 4, false); // Big-endian
                i += 8;

                this.indexList.push({
                    word: wordStr,
                    offset,
                    size
                });

                if (wordStr.startsWith('-') && wordStr.length > 1) {
                    this.suffixes.push(wordStr.substring(1));
                }
            } else {
                break;
            }
        }
    }

    // Exact match search
    public async getDefinition(word: string): Promise<StructuredDefinition[] | null> {
        await this.load();

        const results: StructuredDefinition[] = [];

        // Handle synthesized multi-suffix words (e.g., "ලෝකය -ේ -ක්")
        if (word.includes(' -')) {
            const parts = word.split(' -');
            const baseWord = parts[0];
            const suffixWords = parts.slice(1).map(s => '-' + s);

            const allWordsToFetch = [baseWord, ...suffixWords];

            for (const w of allWordsToFetch) {
                const entries = this.indexList.filter(e => e.word === w);
                const block: StructuredDefinition = {
                    headword: w,
                    homographDefinitions: []
                };
                for (const e of entries) {
                    block.homographDefinitions.push(this.readDictData(e.offset, e.size));
                }
                if (block.homographDefinitions.length > 0) {
                    results.push(block);
                }
            }

            if (results.length > 0) {
                return results;
            }
            return null; // Should not happen if correctly synthesized
        }

        const entries = this.indexList.filter(e => e.word === word);
        if (entries.length === 0) return null;

        const block: StructuredDefinition = {
            headword: word,
            homographDefinitions: entries.map(e => this.readDictData(e.offset, e.size))
        };
        results.push(block);

        return results;
    }

    public async hasExactMatch(word: string): Promise<boolean> {
        await this.load();
        return this.indexList.some(e => e.word === word);
    }

    public async findExistingWords(words: string[]): Promise<string[]> {
        await this.load();
        const wordSet = new Set(this.indexList.map(e => e.word));
        return words.filter(w => wordSet.has(w));
    }

    // Prefix/partial match search
    public async searchWords(query: string, limit: number = 30): Promise<IndexEntry[]> {
        await this.load();
        if (!query) return [];

        const lowerQuery = query.toLowerCase();
        const uniqueMatches = new Map<string, IndexEntry>();

        const addIfUnique = (entry: IndexEntry) => {
            if (uniqueMatches.size >= limit) return;
            if (!uniqueMatches.has(entry.word)) {
                uniqueMatches.set(entry.word, entry);
            }
        };

        // Exact matches
        for (const entry of this.indexList) {
            if (entry.word.toLowerCase() === lowerQuery) {
                addIfUnique(entry);
                if (uniqueMatches.size >= limit) break;
            }
        }

        // Prefix matches
        if (uniqueMatches.size < limit) {
            for (const entry of this.indexList) {
                const lowerWord = entry.word.toLowerCase();
                if (lowerWord.startsWith(lowerQuery) && !uniqueMatches.has(entry.word)) {
                    addIfUnique(entry);
                    if (uniqueMatches.size >= limit) break;
                }
            }
        }

        // Contains matches
        if (uniqueMatches.size < limit) {
            for (const entry of this.indexList) {
                const lowerWord = entry.word.toLowerCase();
                if (lowerWord.includes(lowerQuery) && !uniqueMatches.has(entry.word)) {
                    addIfUnique(entry);
                    if (uniqueMatches.size >= limit) break;
                }
            }
        }

        // Suffix combination matches (recursive)
        if (uniqueMatches.size < limit && !lowerQuery.includes(' ')) {
            this.findSuffixCombinations(lowerQuery, [], uniqueMatches, limit);
        }

        // Convert exactly matched base items to an array to sort alongside synthesized ones safely
        const matchesArray = Array.from(uniqueMatches.values());

        // Sort so that items with FEWER suffixes come first (base words -> 1 suffix -> 2 suffixes)
        matchesArray.sort((a, b) => {
            const aSuf = a.suffixCount || 0;
            const bSuf = b.suffixCount || 0;
            return aSuf - bSuf;
        });

        return matchesArray;
    }

    private findSuffixCombinations(
        currentWord: string,
        foundSuffixes: string[],
        uniqueMatches: Map<string, IndexEntry>,
        limit: number,
        depth: number = 0
    ) {
        if (uniqueMatches.size >= limit || depth >= 3) return;

        // Check if the current leftover word is a valid base word
        if (foundSuffixes.length > 0) {
            const isBaseWordValid = this.indexList.some(e => e.word.toLowerCase() === currentWord);
            if (isBaseWordValid) {
                // Synthesize a virtual entry
                // Re-find the exact casing for the base word
                const baseWordActual = this.indexList.find(e => e.word.toLowerCase() === currentWord)!.word;

                // Reconstruct the suffixes in the correct order (they were found backwards)
                const suffixesStr = [...foundSuffixes].reverse().map(s => `-${s}`).join(' ');
                const synthesizedWord = `${baseWordActual} ${suffixesStr}`;

                if (!uniqueMatches.has(synthesizedWord)) {
                    // Create a virtual IndexEntry.
                    // offset/size are 0 as getDefinition will parse the synthesised word structure.
                    uniqueMatches.set(synthesizedWord, {
                        word: synthesizedWord,
                        offset: 0,
                        size: 0,
                        isSynthesizedMatch: true,
                        suffixCount: foundSuffixes.length
                    });
                }
            }
        }

        // Try breaking off more suffixes
        for (const suffix of this.suffixes) {
            if (currentWord.endsWith(suffix) && currentWord.length > suffix.length) {
                const remainingRoot = currentWord.slice(0, -suffix.length);
                this.findSuffixCombinations(remainingRoot, [...foundSuffixes, suffix], uniqueMatches, limit, depth + 1);
            }
        }
    }

    // Also support fetching full list (useful if showing initial state)
    public async getList(limit: number = 20): Promise<IndexEntry[]> {
        await this.load();
        return this.indexList.slice(0, limit);
    }

    // Get all loaded entries (for dictionary explorer)
    public async getAllEntries(): Promise<IndexEntry[]> {
        await this.load();
        return this.indexList;
    }

    // Search full text of definitions
    public async searchFullText(query: string, limit: number = 100): Promise<IndexEntry[]> {
        await this.load();
        if (!query) return [];
        const lowerQuery = query.toLowerCase();
        const results: IndexEntry[] = [];
        const seen = new Set<string>();

        for (const entry of this.indexList) {
            if (results.length >= limit) break;
            if (seen.has(entry.word)) continue;

            // Check headword first
            if (entry.word.toLowerCase().includes(lowerQuery)) {
                seen.add(entry.word);
                results.push(entry);
                continue;
            }

            // Check definition text
            const defText = this.readDictData(entry.offset, entry.size).toLowerCase();
            if (defText.includes(lowerQuery)) {
                seen.add(entry.word);
                results.push(entry);
            }
        }
        return results;
    }

    private readDictData(offset: number, size: number): string {
        if (!this.dictBuffer) return '';
        const bytes = new Uint8Array(this.dictBuffer, offset, size);
        return new TextDecoder('utf-8').decode(bytes);
    }
}

export const stardict = new StarDictParser();
