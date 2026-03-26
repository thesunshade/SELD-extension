import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDX_PATH = path.join(__dirname, '../public/SELD.idx');
const OUTPUT_PATH = path.join(__dirname, '../utils/bloom-data.ts');

function fnv1a(str) {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
}

function buildBloom() {
    if (!fs.existsSync(IDX_PATH)) {
        console.warn("SELD.idx not found, skipping bloom filter generation.");
        return;
    }
    
    const buffer = fs.readFileSync(IDX_PATH);
    const compounds = new Set();
    
    let i = 0;
    while (i < buffer.length) {
        const start = i;
        while (i < buffer.length && buffer[i] !== 0) {
            i++;
        }
        if (i >= buffer.length) break;
        
        const wordStr = buffer.toString('utf8', start, i);
        i++; 
        
        if (i + 8 <= buffer.length) {
            i += 8;
            if (wordStr.includes(' ') && !wordStr.startsWith('-')) {
                compounds.add(wordStr.trim());
            }
        } else {
            break;
        }
    }
    
    const n = Math.max(compounds.size, 100);
    const p = 0.01;
    let m = Math.ceil(- (n * Math.log(p)) / (Math.pow(Math.log(2), 2)));
    const k = Math.round((m / n) * Math.log(2));
    
    m = Math.ceil(m / 8) * 8;
    const bitset = new Uint8Array(m / 8);
    
    compounds.forEach(word => {
        const hash1 = fnv1a(word);
        const hash2 = fnv1a(word + "_2"); 
        
        for (let j = 0; j < k; j++) {
            const hash = (hash1 + j * hash2) >>> 0;
            const bitIndex = hash % m;
            const byteIndex = Math.floor(bitIndex / 8);
            const bitOffset = bitIndex % 8;
            bitset[byteIndex] |= (1 << bitOffset);
        }
    });

    const base64 = Buffer.from(bitset).toString('base64');
    
    const tsContent = `// Auto-generated Bloom Filter for compound words
// n: ${compounds.size}, m (bits): ${m}, k (hashes): ${k}

export const BLOOM_K = ${k};
export const BLOOM_M = ${m};
const bloomBase64 = "${base64}";

let bloomBitset: Uint8Array | null = null;

function fnv1a(str: string): number {
    let hash = 2166136261;
    for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }
    return hash >>> 0;
}

export function checkBloom(word: string): boolean {
    if (!bloomBitset) {
        bloomBitset = Uint8Array.from(atob(bloomBase64), c => c.charCodeAt(0));
    }
    
    const hash1 = fnv1a(word);
    const hash2 = fnv1a(word + "_2");
    
    for (let j = 0; j < BLOOM_K; j++) {
        const hash = (hash1 + j * hash2) >>> 0;
        const bitIndex = hash % BLOOM_M;
        const byteIndex = Math.floor(bitIndex / 8);
        const bitOffset = bitIndex % 8;
        
        if ((bloomBitset[byteIndex] & (1 << bitOffset)) === 0) {
            return false;
        }
    }
    
    return true;
}
`;

    fs.writeFileSync(OUTPUT_PATH, tsContent, 'utf-8');
    console.log(`✅ Built Bloom Filter for ${compounds.size} compounds. Bytes: ${bitset.length}`);
}

buildBloom();
