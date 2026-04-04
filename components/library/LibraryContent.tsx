import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { BookEntry } from '../../utils/bookDiscovery';
import { scanForTooltips } from '../shared/useGlobalTooltips';

// Module-level storage to persist scroll positions across navigations in the current session
const scrollPositions = new Map<string, number>();

interface LibraryContentProps {
  books: BookEntry[];
}

export default function LibraryContent({ books }: LibraryContentProps) {
  const { bookSlug, chapterSlug } = useParams<{ bookSlug: string; chapterSlug: string }>();
  const contentAreaRef = useRef<HTMLDivElement>(null);

  const currentBook = books.find(b => b.bookSlug === bookSlug);
  const currentChapter = currentBook?.chapters.find(c => c.slug === chapterSlug);

  // Handle CSS Injection per book and per chapter
  useEffect(() => {
    const bookStyleId = `library-style-book-${currentBook?.bookSlug}`;
    const chapterStyleId = `library-style-chapter-${currentBook?.bookSlug}-${currentChapter?.slug}`;
    
    let bookStyleTag: HTMLStyleElement | null = null;
    let chapterStyleTag: HTMLStyleElement | null = null;
    
    if (currentBook?.styleUrl) {
      bookStyleTag = document.createElement('style');
      bookStyleTag.id = bookStyleId;
      bookStyleTag.textContent = `@import url("${currentBook.styleUrl}");`;
      document.head.appendChild(bookStyleTag);
    }

    if (currentChapter?.styleUrl) {
      chapterStyleTag = document.createElement('style');
      chapterStyleTag.id = chapterStyleId;
      chapterStyleTag.textContent = `@import url("${currentChapter.styleUrl}");`;
      document.head.appendChild(chapterStyleTag);
    }

    return () => {
      // Cleanup CSS on navigation or unmount
      if (bookStyleTag) bookStyleTag.remove();
      if (chapterStyleTag) chapterStyleTag.remove();
    };
  }, [currentBook?.styleUrl, currentChapter?.styleUrl, currentBook?.bookSlug, currentChapter?.slug]);

  // Real-time scroll capture to ensure we have the most accurate position before navigation
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (bookSlug && chapterSlug) {
      const path = `${bookSlug}/${chapterSlug}`;
      scrollPositions.set(path, e.currentTarget.scrollTop);
    }
  };

  // Handle Tippy re-initialization and Scroll Restoration
  useEffect(() => {
    const currentPath = `${bookSlug}/${chapterSlug}`;
    const container = contentAreaRef.current;

    if (currentChapter && container) {
      const timer = setTimeout(() => {
        // Restore scroll position after a short delay to ensure content height is calculated
        const savedPos = scrollPositions.get(currentPath) || 0;
        container.scrollTop = savedPos;
        
        // Also scan for tooltips
        scanForTooltips(container);
      }, 50); // 50ms is usually enough for most renders
      
      return () => clearTimeout(timer);
    }
  }, [currentChapter, chapterSlug, bookSlug]);

  // Handle Page Title updates
  useEffect(() => {
    if (bookSlug && chapterSlug && currentChapter && currentBook) {
      // Format: <chapter> | <book> | Library
      // (sub-chap omitted as hierarchy is currently flat)
      document.title = `${currentChapter.title} | ${currentBook.bookTitle} | Library`;
    } else {
      document.title = 'The Bookshelf | Library';
    }
  }, [bookSlug, chapterSlug, currentBook, currentChapter]);


  // THE BOOKSHELF - Landing page state
  if (!bookSlug || !chapterSlug) {
    return (
      <div className="library-content-area" ref={contentAreaRef} onScroll={handleScroll}>
        <h1 className="bookshelf-title">The Bookshelf</h1>
        <p>Your portal to knowledge. Select a book to start exploring.</p>
        
        <div className="bookshelf-grid">
          {books.map(book => (
            <div key={book.bookSlug} className="book-card">
              <div className="book-card-header">
                <h3>{book.bookTitle}</h3>
              </div>
              <div className="book-card-body">
                <span className="book-card-meta">{book.chapters.length} Chapters</span>
                <p className="book-card-description">{book.description || 'No description available.'}</p>
              </div>
              <div className="book-card-footer">
                <a href={`#/${book.chapters[0]?.path}`} className="seld-btn seld-btn-primary seld-btn-pill">
                  Open Book
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 404 STATE
  if (!currentChapter) {
    return (
      <div className="library-content-area" ref={contentAreaRef} onScroll={handleScroll}>
        <h1>404 - Chapter Not Found</h1>
        <p>The chapter "{chapterSlug}" was not found in the book "{currentBook?.bookTitle || bookSlug}".</p>
        <a href="#/" className="seld-btn seld-btn-secondary">Return to Bookshelf</a>
      </div>
    );
  }

  // CHAPTER CONTENT
  return (
    <div className="library-content-area" ref={contentAreaRef} onScroll={handleScroll}>
      {currentChapter.component ? (
        <currentChapter.component />
      ) : currentChapter.rawHtml ? (
        <div dangerouslySetInnerHTML={{ __html: currentChapter.rawHtml }} />
      ) : null}
    </div>
  );
}
