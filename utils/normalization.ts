/**
 * Sinhala Normalization and Fuzzy Search Utilities
 */

/**
 * Normalizes Sinhala text for fuzzy matching.
 * 1. Removes vowel modifiers (\u0DCA to \u0DDF).
 * 2. Standardizes interchangeable consonants:
 *    - ණ (Murdhaja Na) -> න (Na)
 *    - ළ (Murdhaja La) -> ල (La)
 *    - ෂ (Murdhaja Sa) -> ශ (Taluja Sa)
 */
export function normalizeSinhala(text: string): string {
    if (!text) return '';
    
    // Low-level range for vowel modifiers/signs
    // \u0DCA: ් (Al-lakuna)
    // \u0DCE-\u0DDF: Various vowel signs
    let normalized = text.replace(/[\u0DCA-\u0DDF]/g, '');
    
    // Replace interchangeable consonants
    normalized = normalized.replace(/ණ/g, 'න');
    normalized = normalized.replace(/ළ/g, 'ල');
    normalized = normalized.replace(/ෂ/g, 'ශ');
    
    return normalized.toLowerCase();
}

/**
 * Standard Levenshtein distance algorithm to calculate edit distance between strings.
 */
export function levenshteinDistance(s1: string, s2: string): number {
    const m = s1.length;
    const n = s2.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }

    return dp[m][n];
}

/**
 * Calculates a score for how well vowel modifiers match between two strings.
 * Assumes the strings match when normalized.
 * Returns a score between 0.0 and 1.0 based on identical characters.
 */
export function vowelSimilarityScore(query: string, match: string): number {
    const queryChars = [...query];
    const matchChars = [...match];
    const maxLen = Math.max(queryChars.length, matchChars.length);
    if (maxLen === 0) return 1.0;
    
    let score = 0;
    const matchMap = new Map<string, number>();
    for (const char of matchChars) {
        matchMap.set(char, (matchMap.get(char) || 0) + 1);
    }
    
    for (const char of queryChars) {
        if (matchMap.has(char) && matchMap.get(char)! > 0) {
            score++;
            matchMap.set(char, matchMap.get(char)! - 1);
        }
    }
    return score / maxLen;
}
