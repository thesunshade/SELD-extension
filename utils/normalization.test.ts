import { describe, it, expect } from 'vitest';
import { normalizeSinhala, levenshteinDistance, vowelSimilarityScore } from './normalization';

describe('normalizeSinhala', () => {
    it('should remove vowel modifiers', () => {
        expect(normalizeSinhala('පියඹනවා')).toBe('පයඹනව');
        expect(normalizeSinhala('පියාඹනවා')).toBe('පයඹනව');
        expect(normalizeSinhala('කඩොලා')).toBe('කඩල');
    });

    it('should standardize interchangeable consonants', () => {
        expect(normalizeSinhala('උණ')).toBe('උන');
        expect(normalizeSinhala('උන')).toBe('උන');
        expect(normalizeSinhala('ළඟ')).toBe('ලඟ');
        expect(normalizeSinhala('ලඟ')).toBe('ලඟ');
        expect(normalizeSinhala('භාෂාව')).toBe('භශව');
    });

    it('should be case-insensitive (though Sinhala is as well)', () => {
        expect(normalizeSinhala('Test')).toBe('test');
    });

    it('should remove zero-width joiners (ZWJ and ZWNJ)', () => {
        const withZWJ = 'ක්‍රමවේදය'; // Has ZWJ
        const withoutZWJ = 'ක්රමවේදය';
        expect(normalizeSinhala(withZWJ)).toBe(normalizeSinhala(withoutZWJ));
        expect(normalizeSinhala('අ\u200Dති')).toBe('අත');
        expect(normalizeSinhala('අ\u200Cති')).toBe('අත');
    });
});

describe('levenshteinDistance', () => {
    it('should calculate edit distance correctly', () => {
        expect(levenshteinDistance('abc', 'abc')).toBe(0);
        expect(levenshteinDistance('abc', 'abd')).toBe(1);
        expect(levenshteinDistance('abc', 'ab')).toBe(1);
        expect(levenshteinDistance('පියඹනවා', 'පියාඹනවා')).toBe(1);
    });

    it('should ignore ZWJ/ZWNJ in distance calculations', () => {
        expect(levenshteinDistance('ක්‍ර', 'ක්ර')).toBe(0);
        expect(levenshteinDistance('සැප\u200Dයි', 'සැපයි')).toBe(0);
    });
});

describe('vowelSimilarityScore', () => {
    it('should favor strings with more identical characters', () => {
        const query = 'පසෙනවා';
        const match1 = 'පැසෙනවා'; // matches 'ෙ', 'ා'
        const match2 = 'පසනවා';   // matches 'ා'
        expect(vowelSimilarityScore(query, match1)).toBeGreaterThan(vowelSimilarityScore(query, match2));
    });

    it('should ignore ZWJ/ZWNJ in vowel similarity score', () => {
        expect(vowelSimilarityScore('ක්‍ර', 'ක්ර')).toBe(1.0);
    });
});
