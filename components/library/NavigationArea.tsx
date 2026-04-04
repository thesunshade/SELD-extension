import React from 'react';
import { NavLink, useParams } from 'react-router-dom';
import { BookEntry } from '../../utils/bookDiscovery';

interface NavigationAreaProps {
  books: BookEntry[];
  onToggleSidebar?: () => void;
  isSidebarVisible?: boolean;
  isNavVisible?: boolean;
  onToggleNav?: () => void;
}

export default function NavigationArea({ books, onToggleSidebar, isSidebarVisible, isNavVisible, onToggleNav }: NavigationAreaProps) {
  const { bookSlug } = useParams<{ bookSlug: string }>();

  // Find the active book if one is selected
  const activeBook = bookSlug ? books.find(b => b.bookSlug === bookSlug) : null;

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
          <span>The Library</span>
        </div>
        <button
          className={`seld-btn seld-btn-ghost seld-btn-icon-circle library-sidebar-toggle ${isSidebarVisible ? 'active' : ''}`}
          onClick={onToggleSidebar}
          title={isSidebarVisible ? "Hide Dictionary Sidebar" : "Show Dictionary Sidebar"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24"><path fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M15 3.5v17M3 9.4c0-2.24 0-3.36.436-4.216a4 4 0 0 1 1.748-1.748C6.04 3 7.16 3 9.4 3h5.2c2.24 0 3.36 0 4.216.436a4 4 0 0 1 1.748 1.748C21 6.04 21 7.16 21 9.4v5.2c0 2.24 0 3.36-.436 4.216a4 4 0 0 1-1.748 1.748C17.96 21 16.84 21 14.6 21H9.4c-2.24 0-3.36 0-4.216-.436a4 4 0 0 1-1.748-1.748C3 17.96 3 16.84 3 14.6z" /></svg>
        </button>
      </div>
      <div className="library-nav-content">
        {/* Always show back link if in a book */}
        {activeBook ? (
          <div className="library-nav-section">
            <NavLink to="/" className="library-nav-link library-back-link">
              <span>← Back to Bookshelf</span>
            </NavLink>
            <div className="library-nav-title">{activeBook.bookTitle}</div>
            {activeBook.chapters.map(chapter => (
              <NavLink
                key={chapter.slug}
                to={`/${chapter.path}`}
                className={({ isActive }) => `library-nav-link ${isActive ? 'active' : ''}`}
              >
                {chapter.title}
              </NavLink>
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
          </div>
        )}
      </div>
    </div>
  );
}
