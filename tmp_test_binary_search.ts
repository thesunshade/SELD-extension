
import { stardict } from './utils/stardict.ts';

async function test() {
    console.log('--- Loading Dictionary ---');
    await stardict.load();
    const all = await stardict.getAllEntries();
    console.log('Total entries:', all.length);

    if (all.length === 0) {
        console.error('No entries found!');
        return;
    }

    const testWord = all[Math.floor(all.length / 2)].word;
    console.log('\n--- Testing Exact Match (Binary Search) ---');
    console.log('Testing word:', testWord);
    const hasMatch = await stardict.hasExactMatch(testWord);
    console.log('Has exact match:', hasMatch);
    
    const definition = await stardict.getDefinition(testWord);
    console.log('Definition found:', !!definition);
    if (definition) {
        console.log('Headword:', definition[0].headword);
        console.log('Definitions count:', definition[0].homographDefinitions.length);
    }

    console.log('\n--- Testing Prefix Search ---');
    const prefix = testWord.substring(0, Math.min(testWord.length, 3));
    console.log('Testing prefix:', prefix);
    const results = await stardict.searchWords(prefix, 5);
    console.log('Results count:', results.length);
    results.forEach(r => console.log(' -', r.word));

    console.log('\n--- Testing Case Insensitivity ---');
    const lower = testWord.toLowerCase();
    const upper = testWord.toUpperCase();
    console.log('Lower:', lower, 'Match:', await stardict.hasExactMatch(lower));
    console.log('Upper:', upper, 'Match:', await stardict.hasExactMatch(upper));

    console.log('\n--- Testing Non-existent Word ---');
    const fake = 'thisisnotawordinanylanguage123';
    console.log('Fake word:', fake, 'Match:', await stardict.hasExactMatch(fake));
}

test().catch(console.error);
