---
description: How to verify dictionary and search changes
---
Follow these steps whenever modifying `utils/stardict.ts`, `utils/normalization.ts`, or any search-related logic.

1.  **Run All Utility Tests**
    Ensure that normalization and distance logic is still correct.
    ```bash
    npx vitest run utils/normalization.test.ts
    ```

2.  **Run Fuzzy Search Tests**
    Verify that fuzzy matching scenarios still work and rank correctly.
    ```bash
    npx vitest run utils/stardict_fuzzy.test.ts
    ```

3.  **Run Sorting Tests**
    Verify that the priority-based sorting (Exact > Suffix > Fuzzy) is preserved.
    ```bash
    npx vitest run utils/stardict_sort.test.ts
    ```

4.  **Full Verification (Recommended)**
    Run the entire test suite to catch non-obvious regressions.
    // turbo
    ```bash
    npm test
    ```

5.  **Manual Verification**
    - Run the extension with `npm run dev`.
    - Perform a few key searches:
        - `පසෙනවා` (check fuzzy ranking)
        - `කලේ` (check suffix vs exact priority)
        - `පීරන්` (check fuzzy prefix)
