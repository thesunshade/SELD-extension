import React from 'react';

export interface ChapterEntry {
  slug: string;
  title: string;
  path: string; // The URL routing path, e.g., 'intro-to-api/chapter1'
  component: React.ComponentType<any> | null;
  rawHtml: string | null;
  styleUrl: string | null;
  order: number;
}

export interface BookEntry {
  bookSlug: string;
  bookTitle: string;
  chapters: ChapterEntry[];
  styleUrl: string | null;
  description?: string;
}

// Convert a slug/filename to Start Case text
const toStartCase = (str: string) => {
  return str
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export function getBooks(): BookEntry[] {
  // 1. Discover all content files (mdx, tsx, html)
  // Vite injects these modules keyed by file path.
  const contentModules = import.meta.glob('../assets/books/**/*.{mdx,tsx,html}', { eager: true });
  
  // 2. Discover metadata files
  const metaModules = import.meta.glob('../assets/books/**/meta.json', { eager: true });
  
  // 3. Discover style files
  // Using query ?url imports the stylesheet as a URL string that we can inject dynamically
  const styleModules = import.meta.glob('../assets/books/**/*.css', { query: '?url', import: 'default', eager: true });

  const booksMap = new Map<string, BookEntry>();

  // Process metadata to initialize books
  Object.entries(metaModules).forEach(([path, module]) => {
    // path looks like '../assets/books/intro-to-api/meta.json'
    const parts = path.split('/');
    const bookSlug = parts[parts.length - 2];
    const metaParams = (module as any).default || module;
    const title = metaParams.title || toStartCase(bookSlug);

    booksMap.set(bookSlug, {
      bookSlug,
      bookTitle: title,
      chapters: [],
      styleUrl: null,
      description: metaParams.description
    });
  });

  // Temp map to store chapter-specific styles until we process chapters
  const chapterStyles = new Map<string, string>();

  // Process style files
  Object.entries(styleModules).forEach(([path, url]) => {
    // path looks like '../assets/books/intro-to-api/book-theme.css' or '../assets/books/intro-to-api/chapter1.css'
    const parts = path.split('/');
    const bookSlug = parts[parts.length - 2];
    const filename = parts[parts.length - 1];
    
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
      // Store chapter-specific style
      const chapterSlug = filename.replace('.css', '');
      chapterStyles.set(`${bookSlug}/${chapterSlug}`, url as string);
    }
  });

  // Process chapters
  Object.entries(contentModules).forEach(([path, module]) => {
    // path looks like '../assets/books/intro-to-api/chapter1.mdx'
    const parts = path.split('/');
    const bookSlug = parts[parts.length - 2];
    const filename = parts[parts.length - 1];
    
    // Remove extension
    const extMatch = filename.match(/\.(mdx|tsx|html)$/);
    if (!extMatch) return;
    
    const ext = extMatch[1];
    const chapterSlug = filename.replace(`.${ext}`, '');
    const m = module as any;
    
    let title = toStartCase(chapterSlug);
    let component = null;
    let rawHtml = null;

    if (ext === 'mdx') {
      // MDX compiled with @mdx-js/rollup acts as a React component on default export
      component = m.default;
      // remark/rehype frontmatter plugins expose the frontmatter property
      if (m.frontmatter && m.frontmatter.title) {
        title = m.frontmatter.title;
      }
    } else if (ext === 'tsx') {
      component = m.default;
    } else if (ext === 'html') {
      rawHtml = m.default as string; // Vite imports .html as raw string by default
    }

    const book = booksMap.get(bookSlug) || {
      bookSlug,
      bookTitle: toStartCase(bookSlug),
      chapters: [],
      styleUrl: null,
      description: ''
    };

    book.chapters.push({
      slug: chapterSlug,
      title,
      path: `${bookSlug}/${chapterSlug}`,
      component,
      rawHtml,
      styleUrl: chapterStyles.get(`${bookSlug}/${chapterSlug}`) || null,
      order: book.chapters.length // Fallback ordering, you can add frontmatter order logic in future
    });

    booksMap.set(bookSlug, book);
  });

  // Ensure books and chapters are returned in a stable array
  const booksArray = Array.from(booksMap.values());
  booksArray.forEach(book => {
    // Basic sorting (could be enriched later based on explicit 'order' metadata if needed)
    book.chapters.sort((a, b) => {
       // Put index at top
       if (a.slug === 'index' || a.slug === 'readme') return -1;
       if (b.slug === 'index' || b.slug === 'readme') return 1;
       return a.title.localeCompare(b.title);
    });
  });

  return booksArray.sort((a, b) => a.bookTitle.localeCompare(b.bookTitle));
}
