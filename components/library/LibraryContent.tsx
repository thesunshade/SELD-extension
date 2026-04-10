import React, { useEffect, useRef } from 'react';
import { useParams, useOutletContext, useLocation } from 'react-router-dom';
import { BookEntry } from '../../utils/bookDiscovery';
import { scanForTooltips } from '../shared/useGlobalTooltips';
import { LibrarySearchContext } from './LibraryLayout';
import { browser } from 'wxt/browser';
import SearchMatchNav from './SearchMatchNav';

// Module-level storage to persist scroll positions across navigations in the current session
const scrollPositions = new Map<string, number>();

interface LibraryContentProps {
  books: BookEntry[];
}

export default function LibraryContent({ books }: LibraryContentProps) {
  const { bookSlug, chapterSlug } = useParams<{ bookSlug: string; chapterSlug: string }>();
  const { searchQuery } = useOutletContext<LibrarySearchContext>();
  const location = useLocation();
  const contentAreaRef = useRef<HTMLDivElement>(null);
  
  // Storage for last read chapters
  const [lastChapters, setLastChapters] = React.useState<Record<string, string>>({});
  const [currentMatchIndex, setCurrentMatchIndex] = React.useState(-1);
  const [totalMatches, setTotalMatches] = React.useState(0);
  const matchElements = useRef<HTMLElement[]>([]);
  const lastNavRef = useRef({ book: '', chapter: '' });
  const originalScrollPosRef = useRef<number | null>(null);

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

  // Handle Highlighting, Tippy re-initialization and Scroll Restoration
  useEffect(() => {
    const currentPath = `${bookSlug}/${chapterSlug}`;
    const container = contentAreaRef.current;
    const params = new URLSearchParams(location.search);
    const gotoHeading = params.get('goto');

    if (currentChapter && container) {
      const timer = setTimeout(() => {
        if (gotoHeading) {
          const h2s = container.querySelectorAll('h2');
          const target = Array.from(h2s).find(h => h.textContent?.replace(/\s+/g, ' ').trim() === gotoHeading);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        } else {
          // Restore scroll position after a short delay to ensure content height is calculated
          const savedPos = scrollPositions.get(currentPath) || 0;
          container.scrollTop = savedPos;
        }

        // Apply highlights if searching
        if (searchQuery && searchQuery.trim().length > 1) {
          applyHighlights(container, searchQuery.trim());
          
          // Find all matches
          const matches = Array.from(container.querySelectorAll('.seld-content-highlight')) as HTMLElement[];
          matchElements.current = matches;
          setTotalMatches(matches.length);
          
          // Only auto-scroll if we just navigated to this chapter
          const hasNavigated = lastNavRef.current.book !== bookSlug || lastNavRef.current.chapter !== chapterSlug;
          if (matches.length > 0 && hasNavigated) {
            scrollToMatch(0);
          } else {
            setCurrentMatchIndex(-1);
            originalScrollPosRef.current = null; // Reset for new matching session
          }
          
          // Update last navigation ref
          lastNavRef.current = { book: bookSlug || '', chapter: chapterSlug || '' };
        } else {
          removeHighlights(container);
          setTotalMatches(0);
          setCurrentMatchIndex(-1);
          matchElements.current = [];
          originalScrollPosRef.current = null;
        }

        // Also scan for tooltips
        scanForTooltips(container);
      }, 50); // 50ms is usually enough for most renders

      return () => clearTimeout(timer);
    }
  }, [currentChapter, chapterSlug, bookSlug, searchQuery, location.search]);

  const scrollToMatch = (index: number) => {
    const container = contentAreaRef.current;
    if (!container) return;

    const matches = matchElements.current;

    // Handle special "zero" state (return to original position)
    if (index === -1) {
       matches.forEach(m => m.classList.remove('seld-match-active'));
       if (originalScrollPosRef.current !== null) {
         container.scrollTo({ top: originalScrollPosRef.current, behavior: 'smooth' });
       }
       setCurrentMatchIndex(-1);
       return;
    }

    if (matches.length === 0 || index < 0 || index >= matches.length) return;

    // If we're moving from idle (-1) to a match, save the current scroll position
    if (currentMatchIndex === -1 && originalScrollPosRef.current === null) {
      originalScrollPosRef.current = container.scrollTop;
    }

    // Remove old active match
    matches.forEach(m => m.classList.remove('seld-match-active'));

    // Set new active match
    const target = matches[index];
    target.classList.add('seld-match-active');
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setCurrentMatchIndex(index);
  };

  const nextMatch = () => {
    const nextIdx = (currentMatchIndex + 1) % totalMatches;
    scrollToMatch(nextIdx);
  };

  const prevMatch = () => {
    // If at first match (0), go back to original scroll position (-1)
    if (currentMatchIndex === 0) {
      scrollToMatch(-1);
    } else if (currentMatchIndex === -1) {
      // If at original position, go to last match
      scrollToMatch(totalMatches - 1);
    } else {
      scrollToMatch(currentMatchIndex - 1);
    }
  };

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

  // Handle Chapter Persistence
  useEffect(() => {
    if (bookSlug && chapterSlug && currentChapter) {
      browser.storage.local.set({ [`library_last_${bookSlug}`]: chapterSlug });
    }
  }, [bookSlug, chapterSlug, currentChapter]);

  // Handle Last Chapters Loading (for bookshelf)
  useEffect(() => {
    if (!bookSlug || !chapterSlug) {
      const keys = books.map(b => `library_last_${b.bookSlug}`);
      browser.storage.local.get(keys).then(res => {
        const result: Record<string, string> = {};
        Object.entries(res).forEach(([key, val]) => {
          const slug = key.replace('library_last_', '');
          result[slug] = val as string;
        });
        setLastChapters(result);
      });
    }
  }, [bookSlug, chapterSlug, books]);


  // THE BOOKSHELF - Landing page state
  if (!bookSlug || !chapterSlug) {
    return (
      <div className="library-content-area" ref={contentAreaRef} onScroll={handleScroll}>
        <h1 className="bookshelf-title"><img src="/library.png" width="56" />Bookshelf </h1>

        <div className="bookshelf-grid">
          {books.map(book => {
            const lastSlug = lastChapters[book.bookSlug];
            const firstChapter = book.chapters.find(c => !c.isSection);
            const entryPath = lastSlug ? `#/${book.bookSlug}/${lastSlug}` : (firstChapter ? `#/${firstChapter.path}` : '#/');
            
            return (
              <div key={book.bookSlug} className="book-card">
                <a href={entryPath}>
                  <div className="book-card-header">
                    <h3>{book.bookTitle}</h3>
                  </div>
                  <div className="book-card-body">
                    <p className="book-card-description">{book.description || 'No description available.'}</p>
                    <div className="book-card-meta">
                      <span>{book.chapters.filter(c => !c.isSection).length} Chapters</span>
                      {lastSlug && (
                        <span style={{ marginLeft: '10px', fontSize: '0.8em', opacity: 0.7 }}>
                          • last read: "{book.chapters.find(c => c.slug === lastSlug)?.title || lastSlug}"
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="book-card-footer">
                    <a href={entryPath} className="seld-btn seld-btn-primary seld-btn-pill">
                      {lastSlug ? 'Continue Reading' : 'Open Book'}
                    </a>
                  </div>
                </a>
              </div>
            );
          })}
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

      {totalMatches > 0 && (
        <SearchMatchNav 
          currentIndex={currentMatchIndex}
          totalCount={totalMatches}
          onNext={nextMatch}
          onPrev={prevMatch}
        />
      )}
    </div>
  );
}

/**
 * Native DOM-based highlighting to avoid complex React rendering issues with markup.
 */
function applyHighlights(root: HTMLElement, query: string) {
  removeHighlights(root);
  if (!query) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    nodes.push(node);
  }

  const isEnglish = /^[a-zA-Z0-9\s.,!?-]+$/.test(query);
  let regex: RegExp;

  if (isEnglish) {
    regex = new RegExp(`(${query})`, 'gi');
  } else {
    // Escape regex chars for Sinhala
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    regex = new RegExp(`(${escaped})`, 'g');
  }

  nodes.forEach(textNode => {
    const text = textNode.nodeValue || '';
    if (regex.test(text)) {
      const span = document.createElement('span');
      span.className = 'seld-highlight-group';
      span.innerHTML = text.replace(regex, '<mark class="seld-content-highlight">$1</mark>');
      textNode.parentNode?.replaceChild(span, textNode);
    }
  });
}

function removeHighlights(root: HTMLElement) {
  const highlighted = root.querySelectorAll('.seld-highlight-group');
  highlighted.forEach(group => {
    const parent = group.parentNode;
    if (parent) {
      const text = group.textContent || '';
      const textNode = document.createTextNode(text);
      parent.replaceChild(textNode, group);
    }
  });
}
