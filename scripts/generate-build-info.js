import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PACKAGE_JSON_PATH = path.join(ROOT, 'package.json');
const DICT_PATH = path.join(ROOT, 'public/SELD.dict');
const IDX_PATH = path.join(ROOT, 'public/SELD.idx');
const OUTPUT_PATH = path.join(ROOT, 'utils/build-info.ts');

function getEntryCount() {
    if (!fs.existsSync(IDX_PATH)) {
        return 0;
    }
    
    const buffer = fs.readFileSync(IDX_PATH);
    let count = 0;
    let i = 0;
    
    while (i < buffer.length) {
        // Skip word string
        while (i < buffer.length && buffer[i] !== 0) {
            i++;
        }
        if (i >= buffer.length) break;
        
        i++; // skip null terminator
        
        // Skip 8 bytes of offset/length
        if (i + 8 <= buffer.length) {
            i += 8;
            count++;
        } else {
            break;
        }
    }
    return count;
}

function generateBuildInfo() {
    // 1. Get version from package.json
    const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf-8'));
    const version = packageJson.version;

    // 2. Get date of SELD.dict
    let dictDate = 'Unknown';
    if (fs.existsSync(DICT_PATH)) {
        const stats = fs.statSync(DICT_PATH);
        dictDate = stats.mtime.toISOString().split('T')[0];
    }

    // 3. Get entry count from SELD.idx
    const entryCount = getEntryCount();

    const content = `// Auto-generated build information
export const BUILD_INFO = {
    version: "${version}",
    dictionaryDate: "${dictDate}",
    entryCount: ${entryCount},
    buildTime: "${new Date().toISOString()}"
};
`;

    fs.writeFileSync(OUTPUT_PATH, content, 'utf-8');
    console.log(`✅ Generated build-info.ts: Version ${version}, Date ${dictDate}, Entries ${entryCount}`);
}

generateBuildInfo();
