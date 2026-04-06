# Context Summary for Future Work
Here is the condensed technical context you'll need for maintaining or extending The Library:

*   **Discovery Logic**: Found in `utils/bookDiscovery.ts`. The system recursively scans each book folder in `assets/books/`. Chapters (MDX/TSX/HTML) and their local styles are stored in a `chapters/` sub-directory for better organization. Titles are extracted from files (HTML `<title>`, MDX frontmatter, or TSX `metadata`). Slugs are generated dynamically from these titles. If a `meta.json` contains a `structure` array, it should list filenames only, and the system will automatically locate them.
*   **Routing Hierarchy**: 
    -   Root (`/`) = **The Bookshelf** (Grid of cards).
    -   `/:bookSlug/:chapterSlug` = **Chapter View**.
*   **Navigation Area**: Located in `components/library/NavigationArea.tsx`. It's context-aware and only populates chapters when it detects a `bookSlug` in the URL. To collapse it, we use the `isNavVisible` state in `LibraryLayout.tsx`.
*   **Content Injection**: `LibraryContent.tsx` handles the heavy lifting of rendering different file types and injecting book-level CSS (`book-theme.css`).
*   **Glossary Support**: Because content is dynamic, we use `scanForTooltips` on every chapter change to ensure dictionary tooltips apply to the newly rendered DOM.

