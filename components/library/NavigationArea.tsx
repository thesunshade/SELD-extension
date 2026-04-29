import React, { useEffect, useState, useRef } from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { BookEntry, ChapterEntry } from '../../utils/bookDiscovery';
import { bookSearch, SearchResult } from '../../utils/bookSearch';

interface NavigationAreaProps {
  books: BookEntry[];
  onToggleSidebar?: () => void;
  isSidebarVisible?: boolean;
  isNavVisible?: boolean;
  onToggleNav?: () => void;
  searchState: {
    query: string;
    setQuery: (q: string) => void;
    results: SearchResult[];
    setResults: (r: SearchResult[]) => void;
    scope: 'book' | 'all';
    setScope: (s: 'book' | 'all') => void;
  };
}

function ChapterNavItem({
  chapter,
  activeChapterSlug
}: {
  chapter: ChapterEntry;
  activeChapterSlug?: string;
}) {
  const isActive = chapter.slug === activeChapterSlug;
  const [isExpanded, setIsExpanded] = useState(isActive);

  useEffect(() => {
    if (isActive) {
      setIsExpanded(true);
    }
  }, [isActive]);

  const toggleExpand = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsExpanded(!isExpanded);
  };

  const handleHeadingClick = (title: string, e: React.MouseEvent) => {
    if (isActive) {
      e.preventDefault();
      const h2s = document.querySelectorAll('.library-content-area h2');
      const target = Array.from(h2s).find(h => h.textContent?.replace(/\s+/g, ' ').trim() === title);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="library-nav-chapter-group">
      <div style={{ position: 'relative', display: 'flex' }}>
        <NavLink
          to={`/${chapter.path}`}
          className={({ isActive }) => `library-nav-link ${isActive ? 'active' : ''}`}
          style={{ flexGrow: 1, paddingRight: chapter.headings?.length ? '2.5rem' : undefined }}
        >
          {chapter.title}
        </NavLink>
        {chapter.headings && chapter.headings.length > 0 && (
          <button
            onClick={toggleExpand}
            style={{
              position: 'absolute',
              right: '8px',
              top: '50%',
              transform: `translateY(-50%) rotate(${isExpanded ? 90 : 0}deg)`,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'inherit',
              opacity: 0.6,
              padding: '4px',
              transition: 'transform 0.2s',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={isExpanded ? "Collapse Headings" : "Expand Headings"}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        )}
      </div>
      {isExpanded && chapter.headings && chapter.headings.length > 0 && (
        <div className="library-nav-headings-list" >
          {chapter.headings.map((heading, idx) => (
            <NavLink
              key={`${chapter.slug}-h-${idx}`}
              to={`/${chapter.path}?goto=${encodeURIComponent(heading.title)}`}
              onClick={(e) => handleHeadingClick(heading.title, e)}
              className="library-nav-heading-link"

            >
              {heading.title}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavigationArea({
  books,
  onToggleSidebar,
  isSidebarVisible,
  isNavVisible,
  onToggleNav,
  searchState
}: NavigationAreaProps) {
  const { bookSlug, chapterSlug } = useParams<{ bookSlug: string; chapterSlug: string }>();
  const [isSearching, setIsSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const navContentRef = useRef<HTMLDivElement>(null);

  // Find the active book if one is selected
  const activeBook = bookSlug ? books.find(b => b.bookSlug === bookSlug) : null;

  // Handle Search Input
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchState.query.trim().length > 1) {
        setIsSearching(true);
        const results = await bookSearch.search(searchState.query, {
          all: searchState.scope === 'all',
          bookSlug: bookSlug
        });
        searchState.setResults(results);
        setIsSearching(false);
      } else {
        searchState.setResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchState.query, searchState.scope, bookSlug]);

  // Scroll active chapter into view
  useEffect(() => {
    if (navContentRef.current) {
      const activeLink = navContentRef.current.querySelector('.library-nav-link.active');
      if (activeLink) {
        activeLink.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [bookSlug, chapterSlug]);

  const clearSearch = () => {
    searchState.setQuery('');
    searchState.setResults([]);
  };

  return (
    <div className="library-nav-area">
      <div className="library-nav-header">
        <div className="library-nav-header-left">
          {isNavVisible && (
            <button
              className="seld-btn seld-btn-ghost seld-btn-icon-circle library-nav-toggle-inner"
              onClick={onToggleNav}
              title="Hide Navigation"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
          <span>Library</span>
        </div>
        <button
          className={`seld-btn seld-btn-ghost seld-btn-icon-circle library-sidebar-toggle ${isSidebarVisible ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title={isSidebarVisible ? "Hide Dictionary Sidebar" : "Show Dictionary Sidebar"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 3.5v17M3 9.4c0-2.24 0-3.36.436-4.216a4 4 0 0 1 1.748-1.748C6.04 3 7.16 3 9.4 3h5.2c2.24 0 3.36 0 4.216.436a4 4 0 0 1 1.748 1.748C21 6.04 21 7.16 21 9.4v5.2c0 2.24 0 3.36-.436 4.216a4 4 0 0 1-1.748 1.748C17.96 21 16.84 21 14.6 21H9.4c-2.24 0-3.36 0-4.216-.436a4 4 0 0 1-1.748-1.748C3 17.96 3 16.84 3 14.6z" /></svg>
        </button>
      </div>

      <div className="library-search-container">
        <div className="library-search-input-wrapper">
          <svg className="library-search-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <label htmlFor="library-search-input" className="sr-only">Search library</label>
          <input
            id="library-search-input"
            ref={searchInputRef}
            type="text"
            className="library-search-input"
            placeholder={activeBook ? `Search in ${activeBook.bookTitle}...` : "Search Library..."}
            value={searchState.query}
            onChange={(e) => searchState.setQuery(e.target.value)}
          />
          {searchState.query && (
            <button className="library-search-clear" onClick={clearSearch}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
          )}
        </div>

        {searchState.query.trim().length > 0 && activeBook && (
          <div className="library-search-scope">
            <button
              className={`seld-btn seld-btn-secondary seld-btn-pill ${searchState.scope === 'book' ? 'active' : ''}`}
              onClick={() => searchState.setScope('book')}
            >
              Book
            </button>
            <button
              className={`seld-btn seld-btn-secondary seld-btn-pill ${searchState.scope === 'all' ? 'active' : ''}`}
              onClick={() => searchState.setScope('all')}
            >
              Library
            </button>
          </div>
        )}
      </div>

      <div className="library-nav-content" ref={navContentRef}>
        {searchState.query.trim().length > 1 ? (
          <div className="library-search-results">
            <div className="library-nav-section">
              {activeBook && (
                <button
                  className="library-nav-link library-back-link"
                  onClick={clearSearch}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                  <span>Back to Book</span>
                </button>
              )}
            </div>
            <div className="library-nav-section-title">
              {isSearching ? 'Searching...' : `${searchState.results.length} Results Found`}
            </div>
            {searchState.results.map((result, idx) => (
              <NavLink
                key={`${result.entry.bookSlug}-${result.entry.chapterSlug}-${idx}`}
                to={`/${result.entry.bookSlug}/${result.entry.chapterSlug}`}
                className={({ isActive }) => `library-nav-link library-search-result-item ${isActive ? 'active' : ''}`}
              >
                <div className="library-search-result-title">{result.entry.title}</div>
                <div className="library-search-result-book">{books.find(b => b.bookSlug === result.entry.bookSlug)?.bookTitle}</div>
                <div className="library-search-result-snippet" dangerouslySetInnerHTML={{ __html: formatSnippet(result.snippet, searchState.query) }} />
              </NavLink>
            ))}
            {!isSearching && searchState.results.length === 0 && (
              <div className="library-search-no-results">No matches found for "{searchState.query}"</div>
            )}
          </div>
        ) : (
          /* Normal Navigation View */
          activeBook ? (
            <div className="library-nav-section">
              <NavLink to="/" className="library-nav-link library-back-link">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>
                <span>Back to Bookshelf</span>
              </NavLink>
              <div className="library-nav-title">{activeBook.bookTitle}</div>
              {activeBook.chapters.map(chapter => (
                chapter.isSection ? (
                  <div key={chapter.slug} className="library-nav-section-title">
                    {chapter.title}
                  </div>
                ) : (
                  <ChapterNavItem
                    key={chapter.slug}
                    chapter={chapter}
                    activeChapterSlug={chapterSlug}
                  />
                )
              ))}
            </div>
          ) : (
            <div className="library-nav-section">
              <NavLink
                to="/"
                className={({ isActive }) => `library-nav-link ${isActive ? 'active' : ''}`}
              >
                <span>The Bookshelf</span>
              </NavLink>
              {/* Show all books list if not in a book */}
              <div className="library-nav-section-title">All Books</div>
              {books.map(book => (
                <NavLink
                  key={book.bookSlug}
                  to={`/${book.bookSlug}/${book.chapters.find(c => !c.isSection)?.slug}`}
                  className="library-nav-link"
                >
                  {book.bookTitle}
                </NavLink>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

function formatSnippet(snippet: string, query: string): string {
  // Simple highlight - in production we'd want something more robust for Sinhala
  const words = query.split(/\s+/).filter(w => w.length > 0);
  let highlighted = snippet;

  // Highlight English words
  words.forEach(word => {
    if (/^[a-zA-Z0-9]+$/.test(word)) {
      const regex = new RegExp(`(${word})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark>$1</mark>');
    }
  });

  // For Sinhala, we just highlight the whole query for now as a simple fallback
  if (!/^[a-zA-Z0-9\s]+$/.test(query)) {
    // Escape regex chars
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'g');
    highlighted = highlighted.replace(regex, '<mark>$1</mark>');
  }

  return highlighted;
}
