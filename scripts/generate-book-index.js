import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOOKS_DIR = path.join(__dirname, '../assets/books');
const OUTPUT_FILE = path.join(__dirname, '../public/book-index.json');

// Keep this in sync with utils/bookDiscovery.ts
const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '') // Allow letters, numbers, and hyphens (Unicode-aware)
    .replace(/--+/g, '-');
};

function normalizeSinhala(text) {
    if (!text) return '';
    // Remove vowel modifiers (\u0DCA to \u0DDF)
    let normalized = text.replace(/[\u0DCA-\u0DDF]/g, '');
    // Replace interchangeable consonants
    normalized = normalized.replace(/ණ/g, 'න');
    normalized = normalized.replace(/ළ/g, 'ල');
    normalized = normalized.replace(/ෂ/g, 'ශ');
    return normalized.toLowerCase();
}

/**
 * Strips HTML tags, MDX frontmatter, JSX tags, and imports from content.
 */
function sanitizeContent(content, filename) {
    let sanitized = content;

    // 1. Strip Frontmatter (for MDX)
    sanitized = sanitized.replace(/^---[\s\S]*?---/, '');

    // 2. Strip imports and exports (for MDX/TSX)
    sanitized = sanitized.replace(/^import[\s\S]*?;/gm, '');
    sanitized = sanitized.replace(/^export\s+(const|let|var|function|default)[\s\S]*?\{/gm, '');
    // Strip metadata exports specifically 
    sanitized = sanitized.replace(/export\s+const\s+metadata\s*=\s*\{[\s\S]*?\};/gm, '');

    // 3. Strip JSX/HTML tags
    // This is a naive regex but should work for most book content.
    sanitized = sanitized.replace(/<[^>]+>/g, ' ');

    // 4. Strip curly braces {} (often used in JSX props or code)
    sanitized = sanitized.replace(/\{[^}]+\}/g, ' ');

    // 5. Cleanup whitespace
    sanitized = sanitized.replace(/\s+/g, ' ').trim();

    return sanitized;
}

function generateIndex() {
    console.log('📖 Generating book search index...');
    
    if (!fs.existsSync(BOOKS_DIR)) {
        console.log('⚠️ No books directory found at assets/books');
        return;
    }

    const books = fs.readdirSync(BOOKS_DIR).filter(f => {
        try {
            return fs.statSync(path.join(BOOKS_DIR, f)).isDirectory();
        } catch (e) {
            return false;
        }
    });

    const index = [];

    for (const bookSlug of books) {
        const bookPath = path.join(BOOKS_DIR, bookSlug);
        const metaPath = path.join(bookPath, 'meta.json');
        let meta = {};

        if (fs.existsSync(metaPath)) {
            try {
                meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
            } catch (e) {
                console.error(`❌ Error parsing meta.json for book "${bookSlug}"`);
                continue;
            }
        }

        const getFilesRecursively = (dir) => {
            let results = [];
            const list = fs.readdirSync(dir);
            list.forEach(file => {
                const filePath = path.join(dir, file);
                const stat = fs.statSync(filePath);
                if (stat && stat.isDirectory()) {
                    results = results.concat(getFilesRecursively(filePath));
                } else if (/\.(html|mdx|tsx)$/.test(file)) {
                    results.push(filePath);
                }
            });
            return results;
        };

        const discoveredAbsolutePaths = getFilesRecursively(bookPath);

        for (const filePath of discoveredAbsolutePaths) {
            const filename = path.basename(filePath);
            const content = fs.readFileSync(filePath, 'utf-8');
            let title = '';

            // Extract Title (reuse logic from validate-books.js)
            if (filename.endsWith('.html')) {
                const match = content.match(/<title>(.*?)<\/title>/i);
                title = match ? match[1] : '';
            } else if (filename.endsWith('.mdx')) {
                const match = content.match(/^title:\s*(.*)$/m);
                if (match) {
                    title = match[1].replace(/['"]/g, '').trim();
                }
            } else if (filename.endsWith('.tsx')) {
                const match = content.match(/\btitle:\s*["'](.*?)["']/);
                if (match) {
                    title = match[1].trim();
                }
            }

            if (title) {
                const chapterSlug = slugify(title);
                const sanitizedText = sanitizeContent(content, filename);
                
                index.push({
                    bookSlug,
                    chapterSlug,
                    title,
                    text: sanitizedText,
                    normalizedText: normalizeSinhala(sanitizedText)
                });
            }
        }
    }

    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(index, null, 2));
    console.log(`✅ Index generated successfully! (${index.length} chapters indexed at public/book-index.json)\n`);
}

generateIndex();
