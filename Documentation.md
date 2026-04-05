# Documentation

## Adding new lists

### 1. Find the GUID and HTML class in `lists.xml`

In your FLEx `lists.xml` file, each list has a unique GUID and the entries are rendered with a specific HTML class. You need to identify both.

### 2. Update `scripts/extract-lists.js`

Add the new list's GUID → class name mapping to the `GUID_TO_CLASS` object at the top of the script:

```js
const GUID_TO_CLASS = {
  'd7f713e8-e8cf-11d3-9764-00c04f186933': 'partofspeech',
  'b40b7bd0-ede4-44c6-ab1a-5eee36d89376': 'usage',
  '2dd51dfb-2b22-4d78-bb74-4837d6863447': 'language',
  'eb3e64ca-301c-432a-bee2-2f642b211e17': 'variantentrytype',
  '24cae482-fc62-43a1-96f0-cff67bb69c52': 'ownertype_abbreviation',
  // Add your new one here:
  'your-new-guid-here': 'yournewclassname',
};
```

The script may also need a tweak if the new list uses a different XML node type (currently it handles `<item>`, `<positem>`, `<letitem>`, and `<lrtitem>`).

### 3. Update `DefinitionCard.tsx`

Add the new class to the Tippy delegate's `target` selector :

```tsx
target: '.partofspeech, .usage, .language, .variantentrytype, .ownertype_abbreviation, .yournewclassname',
```
and
```tsx
const matched = target.closest('.partofspeech, .usage, .language, .variantentrytype, .ownertype_abbreviation, .complexformtype');
```
and
```tsx
						let groupName = Array.from(el.classList).find(c =>
							['partofspeech', 'usage', 'language', 'variantentrytype', 'ownertype_abbreviation', 'complexformtype'].includes(c)
						);
```

### 4. Update `assets/theme.css`

Add the new class to the abbreviation clickable styles:

```css
.partofspeech,
.usage,
.language,
.variantentrytype,
.ownertype_abbreviation,
.yournewclassname {
  /* existing styles */
}
```

And to the hover rule as well.

### 5. Rebuild

Run `npm run dev` or `npm run build`. The pre-build script will re-extract `abbreviations.json` with the new group, and the UI will pick it up automatically.

That's it — just **4 touch points**: the extraction script, the Tippy delegate selector, and the two CSS rule groups in `theme.css`.

---

## Writing Tests

We use [Vitest](https://vitest.dev/) for unit testing. High-quality tests are critical for the dictionary search logic to prevent regressions in normalization and ranking.

### Running Tests

- **Run all tests**: `npm test`
- **Run specific file**: `npx vitest run utils/stardict_fuzzy.test.ts`
- **Watch mode**: `npx vitest utils/`

### Test Structure

Tests are located alongside the code they test (e.g., `utils/normalization.test.ts`).

#### 1. Normalization Utility Tests
These test the `normalizeSinhala`, `levenshteinDistance`, and `vowelSimilarityScore` functions in isolation.

#### 2. StarDict Parser Tests
These test the search ranking and matching logic. Since `StarDictParser` is a singleton and loads external `.idx` and `.dict` files, you must:
1.  **Mock Fetch**: Mock the dictionary data loading.
2.  **Reset Proxy Singleton**: Use `beforeEach` to reset the private state of the `stardict` instance (as it's a singleton).

```typescript
// Example: stardict_fuzzy.test.ts
beforeEach(async () => {
    vi.clearAllMocks();
    // Reset private singleton state for test isolation
    (stardict as any).isLoaded = false;
    (stardict as any).loadPromise = null;
    (stardict as any).indexList = [];
});
```

### Best Practices

- **Always run the full suite**: Before submitting changes, run `npm test` to ensure no regressions in existing fuzzy or prefix logic.
- **Mock realistic dictionary data**: Use the `createMockIdx` helper in tests to simulate various index scenarios (Exact, Prefix, Suffix).
- **Verify Ranking**: When adding fuzzy cases, always assert the *order* of results, not just their presence.

## Priority scoring


1. Ensure you are running the extension in development mode (`npm run dev`).
2. Search for a term in the sidebar.
3. You should see scores like `P0`, `D1`, `V0.8`, etc., to the right of each result.
4. When you build the extension for production (`npm run build`), these scores will be automatically omitted from the UI.


The `P` (Priority) values correspond to:
- `0`: Exact match
- `1`: Suffix match
- `2`: Prefix match
- `3`: "Contains" match
- `4`: Fuzzy exact match
- `5`: Fuzzy prefix match

D (Fuzzy Distance): Levenshtein distance for fuzzy matches.
V (Vowel Score): Vowel similarity score (0.0 to 1.0).
S (Suffix Count): Number of suffixes for synthesized matches.


## Adding new website overrides

1. Write css
1. place css in file in assets\site-patches
1. add into utils\site-patches.ts
1. add to tooltip on components\shared\SettingsUI.tsx


## The Library & The Bookshelf

The Library is a documentation and book-viewing system built into the extension. It uses static discovery to automatically build a catalog of content.

### Adding a New Book

Create a new directory in `assets/books/[your-book-slug]/`.

Required files:
- **`meta.json`**: Contains book metadata.
  ```json
  {
    "title": "Your Book Title",
    "description": "A brief summary of what this book covers."
  }
  ```
- **Chapters**: Added as `.mdx`, `.tsx`, or `.html` files in the book directory.

Optional files:
- **`book-theme.css`**: If present, this CSS will be automatically injected into the page when any chapter of this book is being read. Use it for book-specific styling overrides.

### 2. Chapter Content Types

- **MDX (`.mdx`)**: Best for standard documentation. 
  - Support React components.
  - Define a title in frontmatter: `--- title: My Chapter ---`.
  - Tooltips (`data-tippy-content`) are automatically supported.
- **React (`.tsx`)**: Best for interactive tutorials or complex layouts.
  - Export a default React component.
- **HTML (`.html`)**: Best for legacy content or simple static pages.
  - The raw HTML is rendered directly.

### 3. How it Works (Architecture)

**Discovery**: `utils/bookDiscovery.ts` uses Vite's `import.meta.glob` to find all files in `assets/books/` at build time. It organizes them into `BookEntry` and `ChapterEntry` objects.
1. **Routing**: The feature uses `HashRouter` (React Router v6).
   - `/`: Displays **The Bookshelf** (a grid of all discovered books).
   - `/:bookSlug/:chapterSlug`: Displays a specific chapter.
1. **Layout**: `LibraryLayout.tsx` hosts the **Navigation Area** (sidebar). The sidebar is context-aware: it only shows the Table of Contents when a specific book is active.
1. **Title Management**: `LibraryContent.tsx` dynamically updates `document.title` in the format: `Chapter | Book | Library`.
1. **Glossary/Tooltips**: Since content is rendered dynamically, we call `scanForTooltips` (from `useGlobalTooltips.ts`) whenever a chapter changes to ensure glossary tooltips apply to all compatible HTML tags.

### 4. UI Customization

Styles for the library are located in `components/library/Library.css`. The system uses CSS variables from `assets/theme.css` for a consistent experience with the rest of the extension.

To toggle the navigation area, click the **hamburger/X** button at the top-left of the Library interface.