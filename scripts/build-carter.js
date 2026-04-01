import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INPUT_PATH = path.join(__dirname, '../data/carter.txt');
const OUTPUT_PATH = path.join(__dirname, '../public/carter_index.json');

function buildCarterIndex() {
    if (!fs.existsSync(INPUT_PATH)) {
        console.warn("carter.txt not found, skipping Carter index generation.");
        return;
    }

    const content = fs.readFileSync(INPUT_PATH, 'utf-8');
    // Using simple \n or \r\n split, mapping to lowercase and trimming
    const words = content.split('\n')
        .map(line => line.trim().toLowerCase())
        .filter(line => line.length > 0);

    // Filter duplicates via Set
    const uniqueWords = [...new Set(words)];

    // Sort to support binary search (using standard string compare)
    uniqueWords.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);

    // Save as JSON string array
    // Formatting compactly to save space
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(uniqueWords));
    console.log(`✅ Built Carter index with ${uniqueWords.length} entries.`);
}

buildCarterIndex();
