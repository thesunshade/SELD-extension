import React from 'react';

export interface ChapterEntry {
  slug: string;
  title: string;
  path: string; // The URL routing path, e.g., 'intro-to-api/chapter1'
  component: React.ComponentType<any> | null;
  rawHtml: string | null;
  styleUrl: string | null;
  order: number;
  isSection?: boolean;
}

export interface BookEntry {
  bookSlug: string;
  bookTitle: string;
  chapters: ChapterEntry[];
  styleUrl: string | null;
  description?: string;
}

// Convert a string to a URL-safe slug
export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}-]+/gu, '') // Allow letters, numbers, and hyphens (Unicode-aware)
    .replace(/--+/g, '-');
};

// Convert a slug/filename to Start Case text (fallback only)
const toStartCase = (str: string) => {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export function getBooks(): BookEntry[] {
  // 1. Discover all content files
  // MDX and TSX are imported as modules (default export is a React component)
  const moduleModules = import.meta.glob('../assets/books/**/*.{mdx,tsx}', { eager: true });
  // HTML files are imported as raw strings
  const htmlModules = import.meta.glob('../assets/books/**/*.html', { query: '?raw', import: 'default', eager: true });
  
  // Combine all content modules
  const contentModules = { ...moduleModules, ...htmlModules };
  
  // 2. Discover metadata files
  const metaModules = import.meta.glob('../assets/books/**/meta.json', { eager: true });
  
  // 3. Discover style files
  // Using query ?url imports the stylesheet as a URL string that we can inject dynamically
  const styleModules = import.meta.glob('../assets/books/**/*.css', { query: '?url', import: 'default', eager: true });

  const booksMap = new Map<string, BookEntry>();
  const bookMetas = new Map<string, any>();

  // Process metadata to initialize books
  Object.entries(metaModules).forEach(([path, module]) => {
    const bookSlugMatch = path.match(/assets\/books\/([^/]+)/);
    if (!bookSlugMatch) return;
    const bookSlug = bookSlugMatch[1];
    
    const metaParams = (module as any).default || module;
    bookMetas.set(bookSlug, metaParams);

    booksMap.set(bookSlug, {
      bookSlug,
      bookTitle: metaParams.title || toStartCase(bookSlug),
      chapters: [],
      styleUrl: null,
      description: metaParams.description
    });
  });

  // Temp map to store chapter-specific styles and found files
  const chapterStyles = new Map<string, string>();
  const discoveredFilesByBook = new Map<string, Map<string, any>>(); // bookSlug -> filename -> module

  // Process style files
  Object.entries(styleModules).forEach(([path, url]) => {
    const bookSlugMatch = path.match(/assets\/books\/([^/]+)/);
    if (!bookSlugMatch) return;
    const bookSlug = bookSlugMatch[1];
    const filename = path.split('/').pop()!;
    
    if (filename === 'book-theme.css') {
      const book = booksMap.get(bookSlug) || {
        bookSlug,
        bookTitle: toStartCase(bookSlug),
        chapters: [],
        styleUrl: null,
        description: ''
      };
      book.styleUrl = url as string;
      booksMap.set(bookSlug, book);
    } else {
      const chapterSlug = filename.replace('.css', '');
      chapterStyles.set(`${bookSlug}/${chapterSlug}`, url as string);
    }
  });

  // Group discovered content files by book
  Object.entries(contentModules).forEach(([path, module]) => {
    const bookSlugMatch = path.match(/assets\/books\/([^/]+)/);
    if (!bookSlugMatch) return;
    const bookSlug = bookSlugMatch[1];
    const filename = path.split('/').pop()!;
    
    if (!discoveredFilesByBook.has(bookSlug)) {
      discoveredFilesByBook.set(bookSlug, new Map());
    }
    discoveredFilesByBook.get(bookSlug)!.set(filename, module);
  });

  // Process each book
  discoveredFilesByBook.forEach((filesMap, bookSlug) => {
    const meta = bookMetas.get(bookSlug);
    const book = booksMap.get(bookSlug) || {
      bookSlug,
      bookTitle: toStartCase(bookSlug),
      chapters: [],
      styleUrl: null,
      description: ''
    };

    const structure = meta?.structure as (string | { type: string; title: string })[] | undefined;
    
    // If structure is present, validate exhausitiveness
    if (structure) {
      const structureFiles = structure.filter(item => typeof item === 'string') as string[];
      const discoveredFiles = Array.from(filesMap.keys());
      
      const missingInStructure = discoveredFiles.filter(f => !structureFiles.includes(f));
      if (missingInStructure.length > 0) {
        throw new Error(`Book "${bookSlug}" has structure defined, but is missing files: ${missingInStructure.join(', ')}`);
      }
      
      const nonExistentInStructure = structureFiles.filter(f => !discoveredFiles.includes(f));
      if (nonExistentInStructure.length > 0) {
        throw new Error(`Book "${bookSlug}" structure references non-existent files: ${nonExistentInStructure.join(', ')}`);
      }
    }

    // Process chapters based on structure or fallback to all discovered files
    const sequence = structure || Array.from(filesMap.keys()).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const usedSlugs = new Set<string>();

    sequence.forEach((item, index) => {
      if (typeof item !== 'string' && item.type === 'section') {
        book.chapters.push({
          slug: `section-${index}`,
          title: item.title,
          path: '',
          component: null,
          rawHtml: null,
          styleUrl: null,
          order: index,
          isSection: true
        });
        return;
      }

      const filename = item as string;
      const module = filesMap.get(filename);
      if (!module) return;

      const extMatch = filename.match(/\.(mdx|tsx|html)$/);
      if (!extMatch) return;
      const ext = extMatch[1];
      const m = module as any;
      const fileSlugBase = filename.replace(`.${ext}`, '');

      let title = '';
      let component = null;
      let rawHtml = null;

      if (ext === 'mdx') {
        component = m.default;
        title = m.frontmatter?.title;
      } else if (ext === 'tsx') {
        component = m.default;
        title = m.metadata?.title;
      } else if (ext === 'html') {
        rawHtml = typeof module === 'string' ? module : m.default;
        const match = (rawHtml as string).match(/<title>(.*?)<\/title>/i);
        title = match ? match[1] : '';
      }

      if (!title) {
        throw new Error(`File "${filename}" in book "${bookSlug}" is missing a title.`);
      }

      const slug = slugify(title);
      if (usedSlugs.has(slug)) {
        throw new Error(`Duplicate slug "${slug}" generated from title "${title}" in book "${bookSlug}". Titles must be unique.`);
      }
      usedSlugs.add(slug);

      book.chapters.push({
        slug,
        title,
        path: `${bookSlug}/${slug}`,
        component,
        rawHtml,
        styleUrl: chapterStyles.get(`${bookSlug}/${fileSlugBase}`) || null,
        order: index,
      });
    });

    booksMap.set(bookSlug, book);
  });

  const booksArray = Array.from(booksMap.values());
  return booksArray.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
}
