import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { BookEntry } from '../../utils/bookDiscovery';
import { scanForTooltips } from '../shared/useGlobalTooltips';

interface LibraryContentProps {
  books: BookEntry[];
}

export default function LibraryContent({ books }: LibraryContentProps) {
  const { bookSlug, chapterSlug } = useParams<{ bookSlug: string; chapterSlug: string }>();

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

  // Handle Tippy re-initialization
  useEffect(() => {
    if (currentChapter) {
      const timer = setTimeout(() => {
        scanForTooltips(document.querySelector('.library-content-area') as HTMLElement);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [currentChapter]);

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
      <div className="library-content-area">
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
      <div className="library-content-area">
        <h1>404 - Chapter Not Found</h1>
        <p>The chapter "{chapterSlug}" was not found in the book "{currentBook?.bookTitle || bookSlug}".</p>
        <a href="#/" className="seld-btn seld-btn-secondary">Return to Bookshelf</a>
      </div>
    );
  }

  // CHAPTER CONTENT
  return (
    <div className="library-content-area">
      {currentChapter.component ? (
        <currentChapter.component />
      ) : currentChapter.rawHtml ? (
        <div dangerouslySetInnerHTML={{ __html: currentChapter.rawHtml }} />
      ) : null}
    </div>
  );
}
