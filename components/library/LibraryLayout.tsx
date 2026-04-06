import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import NavigationArea from './NavigationArea';
import SidebarApp from '../sidebar/App';
import { BookEntry } from '../../utils/bookDiscovery';
import { SearchResult } from '../../utils/bookSearch';
import { browser } from 'wxt/browser';
import { setupSidebarEvents } from '../../utils/selection-handler';

import '../../assets/theme.css';
import '../../assets/content.css';
import '../../assets/sidebar.css';
import '../sidebar/App.css';
import './Library.css';

interface LibraryLayoutProps {
  books: BookEntry[];
}

export interface LibrarySearchContext {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  searchResults: SearchResult[];
  setSearchResults: (r: SearchResult[]) => void;
  searchScope: 'book' | 'all';
  setSearchScope: (s: 'book' | 'all') => void;
}

/**
 * Shared layout for the Library system.
 * This component hosts the NavigationArea (sidebar) so that it resides
 * WITHIN the route context, allowing it to correctly access URL parameters
 * like :bookSlug and :chapterSlug.
 */
export default function LibraryLayout({ books }: LibraryLayoutProps) {
  const [isNavVisible, setIsNavVisible] = useState(true);
  const [isSidebarVisible, setIsSidebarVisible] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('right');
  const [sidebarWidth, setSidebarWidth] = useState(350);

  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchScope, setSearchScope] = useState<'book' | 'all'>('book');

  useEffect(() => {
    // Initial load
    browser.storage.local.get(['seldSidebarVisible', 'seldSidebarPosition', 'sidebarWidth']).then(res => {
      if (res.seldSidebarVisible !== undefined) setIsSidebarVisible(!!res.seldSidebarVisible);
      if (res.seldSidebarPosition === 'left' || res.seldSidebarPosition === 'right') {
        setSidebarPosition(res.seldSidebarPosition as 'left' | 'right');
      }
      if (typeof res.sidebarWidth === 'number') setSidebarWidth(res.sidebarWidth);
    });

    // Listen for changes
    const handleStorageChange = (changes: Record<string, any>, namespace: string) => {
      if (namespace === 'local') {
        if (changes.seldSidebarVisible) setIsSidebarVisible(!!changes.seldSidebarVisible.newValue);
        if (changes.seldSidebarPosition) {
          const val = changes.seldSidebarPosition.newValue;
          if (val === 'left' || val === 'right') {
            setSidebarPosition(val as 'left' | 'right');
          }
        }
        if (changes.sidebarWidth && typeof changes.sidebarWidth.newValue === 'number') {
          setSidebarWidth(changes.sidebarWidth.newValue);
        }
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    return () => browser.storage.onChanged.removeListener(handleStorageChange);
  }, []);

  useEffect(() => {
    // Add necessary classes for dictionary components to function
    document.documentElement.classList.add('seld-active');
    document.body.classList.add('seld-active');

    const cleanup = setupSidebarEvents(
      () => isSidebarVisible,
      () => {
        if (!isSidebarVisible) toggleSidebar();
      }
    );

    return () => {
      document.documentElement.classList.remove('seld-active');
      document.body.classList.remove('seld-active');
      cleanup();
    };
  }, [isSidebarVisible]);

  const toggleSidebar = () => {
    const nextValue = !isSidebarVisible;
    setIsSidebarVisible(nextValue);
    browser.storage.local.set({ seldSidebarVisible: nextValue });
  };

  return (
    <div className={`library-container ${isNavVisible ? 'nav-visible' : 'nav-hidden'} ${isSidebarVisible ? 'sidebar-visible' : 'sidebar-hidden'}`}>
      {!isNavVisible && (
        <button 
          className="seld-btn seld-btn-secondary seld-btn-icon-circle library-nav-toggle"
          onClick={() => setIsNavVisible(true)}
          title="Show Navigation"
          style={{
            left: (isSidebarVisible && sidebarPosition === 'left') ? `${sidebarWidth + 15}px` : '15px'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="4" y1="12" x2="20" y2="12"></line>
            <line x1="4" y1="6" x2="20" y2="6"></line>
            <line x1="4" y1="18" x2="20" y2="18"></line>
          </svg>
        </button>
      )}
      
      <NavigationArea 
        books={books} 
        onToggleSidebar={toggleSidebar} 
        isSidebarVisible={isSidebarVisible} 
        isNavVisible={isNavVisible}
        onToggleNav={() => setIsNavVisible(false)}
        searchState={{
          query: searchQuery,
          setQuery: setSearchQuery,
          results: searchResults,
          setResults: setSearchResults,
          scope: searchScope,
          setScope: setSearchScope
        }}
      />
      
      {isSidebarVisible && sidebarPosition === 'left' && (
        <div id="seld-sidebar-root">
          <SidebarApp inline={true} onClose={toggleSidebar} />
        </div>
      )}

      <div className="library-main-content">
        <Outlet context={{
          searchQuery,
          setSearchQuery,
          searchResults,
          setSearchResults,
          searchScope,
          setSearchScope
        } as LibrarySearchContext} />
      </div>

      {isSidebarVisible && sidebarPosition === 'right' && (
        <div id="seld-sidebar-root">
          <SidebarApp inline={true} onClose={toggleSidebar} />
        </div>
      )}
    </div>
  );
}
