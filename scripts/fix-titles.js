import fs from 'fs';
import path from 'path';

const BOOK_DIR = 'assets/books/Colloquial-Sinhala';
const META_PATH = path.join(BOOK_DIR, 'meta.json');

function fix() {
  console.log('🛠 Starting Colloquial Sinhala cleanup...');

  const files = fs.readdirSync(BOOK_DIR)
    .filter(f => f.endsWith('.html'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const structure = [
    { type: "section", title: "Part 1: The Basics" }
  ];

  files.forEach(filename => {
    const filePath = path.join(BOOK_DIR, filename);
    let content = fs.readFileSync(filePath, 'utf-8');

    // Find title from h1 or h2
    let title = '';
    const h1Match = content.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/i);
    if (h1Match) {
      title = h1Match[1].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
    } 

    if (!title || title === 'Colloquial Sinhala' || title === 'Lesson') {
       if (filename.includes('Frontmatter')) {
           title = 'Frontmatter';
       } else {
          // Fallback to pretty filename (e.g. 04_Lesson_4 -> Lesson 4)
          title = filename.replace('.html', '').replace(/^\d+[_]*/, '').replace(/[_-]/g, ' ');
       }
    }

    // Ensure title is clean
    title = title.replace(/\s+/g, ' ');

    // Ensure head exists
    if (!content.includes('<head>')) {
      content = content.replace('<html>', '<html>\n<head>\n</head>');
    }

    // Add or replace title
    if (content.includes('<title>')) {
      content = content.replace(/<title>.*?<\/title>/i, `<title>${title}</title>`);
    } else {
      content = content.replace('</head>', `  <title>${title}</title>\n</head>`);
    }

    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`✅ Fixed ${filename} -> Title: ${title}`);
    
    // Build structure
    structure.push(filename);
  });

  // Re-write Meta JSON with correct filenames
  if (fs.existsSync(META_PATH)) {
    const meta = JSON.parse(fs.readFileSync(META_PATH, 'utf-8'));
    meta.structure = structure;
    fs.writeFileSync(META_PATH, JSON.stringify(meta, null, 2), 'utf-8');
    console.log('✅ Updated meta.json structure with actual filenames.');
  }
}

fix();
