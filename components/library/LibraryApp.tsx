import React, { useMemo } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import LibraryLayout from './LibraryLayout';
import LibraryContent from './LibraryContent';
import { getBooks } from '../../utils/bookDiscovery';

/**
 * The Library: Documentation and Learning System.
 * Main shell handling the routing between the Bookshelf landing page and individual Book chapters.
 */
export default function LibraryApp() {
  const books = useMemo(() => getBooks(), []);

  return (
    <HashRouter>
      <Routes>
        <Route element={<LibraryLayout books={books} />}>
          <Route path="/" element={<LibraryContent books={books} />} />
          <Route path="/:bookSlug/:chapterSlug" element={<LibraryContent books={books} />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
