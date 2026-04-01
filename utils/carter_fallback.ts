import { browser } from "wxt/browser";

let carterIndex: string[] | null = null;
let fetchPromise: Promise<string[]> | null = null;

/**
 * Initializes and fetches the Carter dictionary index if not already loaded.
 */
async function getCarterIndex(): Promise<string[]> {
    if (carterIndex) return carterIndex;
    if (fetchPromise) return fetchPromise;

    fetchPromise = fetch(browser.runtime.getURL('/carter_index.json'))
        .then(res => res.json())
        .then(data => {
            carterIndex = data;
            return data;
        })
        .catch(err => {
            console.error("Failed to load Carter index", err);
            return [];
        });
    return fetchPromise;
}

/**
 * Performs a binary search on the loaded Carter index.
 * Case-insensitive search against the lowercased index.
 */
export async function checkCarterDictionary(term: string): Promise<boolean> {
    const index = await getCarterIndex();
    if (!index || index.length === 0) return false;

    const normalizedTerm = term.trim().toLowerCase();
    
    let low = 0;
    let high = index.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const midVal = index[mid];

        if (midVal === normalizedTerm) return true;
        if (midVal < normalizedTerm) {
            low = mid + 1;
        } else {
            high = mid - 1;
        }
    }

    return false;
}

/**
 * Returns the proper redirect URL for the Carter Dictionary.
 */
export function getCarterUrl(term: string): string {
    return `https://dsal.uchicago.edu/cgi-bin/app/carter_query.py?qs=${encodeURIComponent(term.trim())}&matchtype=default`;
}
