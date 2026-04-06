import { normalizeSinhala, levenshteinDistance, vowelSimilarityScore } from './normalization';

export interface BookIndexEntry {
    bookSlug: string;
    chapterSlug: string;
    title: string;
    text: string;
    normalizedText: string;
}

export interface SearchResult {
    entry: BookIndexEntry;
    score: number;
    snippet: string;
}

class BookSearchEngine {
    private index: BookIndexEntry[] = [];
    private isLoaded = false;
    private loadPromise: Promise<void> | null = null;

    async load() {
        if (this.loadPromise) return this.loadPromise;

        this.loadPromise = (async () => {
            if (this.isLoaded) return;
            try {
                const response = await fetch(chrome.runtime.getURL('/book-index.json'));
                if (!response.ok) throw new Error('Failed to load book index');
                this.index = await response.json();
                this.isLoaded = true;
            } catch (err) {
                console.error('Failed to load book search index:', err);
                this.loadPromise = null;
            }
        })();

        return this.loadPromise;
    }

    public async search(query: string, scope: { all: boolean; bookSlug?: string }): Promise<SearchResult[]> {
        await this.load();
        if (!query.trim()) return [];

        const normalizedQuery = normalizeSinhala(query.trim());
        const isEnglish = /^[a-zA-Z0-9\s.,!?-]+$/.test(query);

        const results: SearchResult[] = [];

        for (const entry of this.index) {
            // Apply scope filter
            if (!scope.all && scope.bookSlug && entry.bookSlug !== scope.bookSlug) {
                continue;
            }

            let score = 0;
            let matchIndex = -1;

            if (isEnglish) {
                // English search (simple includes)
                const lowerText = entry.text.toLowerCase();
                const lowerQuery = query.toLowerCase();
                matchIndex = lowerText.indexOf(lowerQuery);
                if (matchIndex !== -1) {
                    score = 100 - (matchIndex / 1000); // Prefer earlier matches
                }
            } else {
                // Sinhala fuzzy search
                matchIndex = entry.normalizedText.indexOf(normalizedQuery);
                if (matchIndex !== -1) {
                    score = 100;
                    // Add boost for exact match including vowels
                    const originalSnippet = entry.text.substring(matchIndex, matchIndex + query.length + 5);
                    const similarity = vowelSimilarityScore(query, originalSnippet);
                    score += similarity * 10;
                } else {
                    // Try very limited fuzzy (Levenshtein distance 1 or 2 on normalized text)
                    // Note: This is expensive if done on full text. 
                    // Better to only do this for title or short snippets if index is large.
                    // For now, let's limit fuzzy to title match if no body match found.
                    const titleNormalized = normalizeSinhala(entry.title);
                    const dist = levenshteinDistance(normalizedQuery, titleNormalized);
                    if (dist <= 2) {
                        score = 50 - dist * 10;
                        matchIndex = 0; // Show snippet from start if title fuzzy match
                    }
                }
            }

            if (score > 0) {
                results.push({
                    entry,
                    score,
                    snippet: this.generateSnippet(entry.text, matchIndex, query)
                });
            }
        }

        return results.sort((a, b) => b.score - a.score);
    }

    private generateSnippet(text: string, matchIndex: number, query: string): string {
        const snippetLength = 120;
        const start = Math.max(0, matchIndex - 40);
        const end = Math.min(text.length, start + snippetLength);
        
        let snippet = text.substring(start, end);
        
        if (start > 0) snippet = '...' + snippet;
        if (end < text.length) snippet = snippet + '...';
        
        return snippet;
    }
}

export const bookSearch = new BookSearchEngine();
