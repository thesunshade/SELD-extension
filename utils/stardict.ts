// utils/stardict.ts

export interface DictEntry {
    word: string;
    definition: string;
}

export interface IndexEntry {
    word: string;
    offset: number;
    size: number;
}

class StarDictParser {
    private idxBuffer: ArrayBuffer | null = null;
    private dictBuffer: ArrayBuffer | null = null;
    private indexList: IndexEntry[] = [];
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
            } else {
                break;
            }
        }
    }

    // Exact match search
    public async getDefinition(word: string): Promise<string | null> {
        await this.load();
        const entries = this.indexList.filter(e => e.word === word);
        if (entries.length === 0) return null;

        const definitions = await Promise.all(
            entries.map(e => this.readDictData(e.offset, e.size))
        );

        if (definitions.length === 1) return definitions[0];

        // Join definitions with a horizontal rule
        return definitions.join('<hr class="homograph-separator" />');
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

        return Array.from(uniqueMatches.values());
    }

    // Also support fetching full list (useful if showing initial state)
    public async getList(limit: number = 20): Promise<IndexEntry[]> {
        await this.load();
        // Return unique words from the start
        const unique = new Map<string, IndexEntry>();
        for (const entry of this.indexList) {
            if (!unique.has(entry.word)) {
                unique.set(entry.word, entry);
            }
            if (unique.size >= limit) break;
        }
        return Array.from(unique.values());
    }

    private readDictData(offset: number, size: number): string {
        if (!this.dictBuffer) return '';
        const bytes = new Uint8Array(this.dictBuffer, offset, size);
        return new TextDecoder('utf-8').decode(bytes);
    }
}

export const stardict = new StarDictParser();
