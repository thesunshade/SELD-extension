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