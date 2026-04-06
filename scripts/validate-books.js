import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BOOKS_DIR = path.join(__dirname, '../assets/books');

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

function validate() {
  console.log('📚 Validating books structure and metadata...');
  
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

  let totalErrors = 0;

  for (const bookSlug of books) {
    const bookPath = path.join(BOOKS_DIR, bookSlug);
    const metaPath = path.join(bookPath, 'meta.json');
    let meta = {};

    if (fs.existsSync(metaPath)) {
      try {
        meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
      } catch (e) {
        console.error(`❌ Error parsing meta.json for book "${bookSlug}"`);
        totalErrors++;
        continue;
      }
    }

    const discoveredFiles = fs.readdirSync(bookPath).filter(f => /\.(html|mdx|tsx)$/.test(f));
    const structure = meta.structure;

    // 1. Validate Structure Exhaustiveness
    if (structure) {
      const structureFiles = structure.filter(item => typeof item === 'string');
      
      const missingInStructure = discoveredFiles.filter(f => !structureFiles.includes(f));
      if (missingInStructure.length > 0) {
        console.error(`❌ Book "${bookSlug}" has structure defined, but is missing files: ${missingInStructure.join(', ')}`);
        totalErrors++;
      }

      const nonExistentInStructure = structureFiles.filter(f => !discoveredFiles.includes(f));
      if (nonExistentInStructure.length > 0) {
        console.error(`❌ Book "${bookSlug}" structure references non-existent files: ${nonExistentInStructure.join(', ')}`);
        totalErrors++;
      }
    }

    // 2. Validate Titles and Slugs
    const usedSlugs = new Set();
    for (const filename of discoveredFiles) {
      const filePath = path.join(bookPath, filename);
      const content = fs.readFileSync(filePath, 'utf-8');
      let title = '';

      if (filename.endsWith('.html')) {
        const match = content.match(/<title>(.*?)<\/title>/i);
        title = match ? match[1] : '';
      } else if (filename.endsWith('.mdx')) {
        // MDX: Look for title: line anywhere (most robust for raw parsing)
        const match = content.match(/^title:\s*(.*)$/m);
        if (match) {
          title = match[1].replace(/['"]/g, '').trim();
        }
      } else if (filename.endsWith('.tsx')) {
        // TSX: Look for title: "..." inside metadata or similar
        const match = content.match(/\btitle:\s*["'](.*?)["']/);
        if (match) {
          title = match[1].trim();
        }
      }

      if (!title) {
        console.error(`❌ File "${filename}" in book "${bookSlug}" is missing a title.`);
        totalErrors++;
      } else {
        const slug = slugify(title);
        if (usedSlugs.has(slug)) {
          console.error(`❌ Duplicate slug "${slug}" (from title "${title}") in book "${bookSlug}". Titles must be unique.`);
          totalErrors++;
        }
        usedSlugs.add(slug);
      }
    }
  }

  if (totalErrors > 0) {
    console.error(`\n🛑 Book validation failed with ${totalErrors} error(s). Please fix them to proceed with the build.`);
    process.exit(1);
  }

  console.log('✅ Books validation passed.\n');
}

validate();
