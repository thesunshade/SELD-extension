import '../assets/content.css';
import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        let lastQueryTime = 0;

        const handleSelection = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const text = selection.toString().trim();

            // Limit to 50 characters to avoid grabbing massive text blocks accidentally
            if (text && text.length > 0 && text.length < 50) {
                chrome.storage.local.get(['seldLookupEnabled'], (result) => {
                    // Default to true if not set, but user can toggle it
                    const isEnabled = result.seldLookupEnabled !== false;
                    if (!isEnabled) return;

                    const now = Date.now();
                    // Debounce simple lookups
                    if (now - lastQueryTime > 300) {
                        chrome.storage.local.set({ 'seldSearchQuery': text });
                        // Attempt to open side panel
                        chrome.runtime.sendMessage({ action: 'openSidePanel' });
                        lastQueryTime = now;
                    }
                });
            }
        };

        window.addEventListener('mouseup', handleSelection);
        // Double click often triggers mouseup, but we could also attach to dblclick if needed explicitly

        // -------------------------------------------------------------
        // Highlight Extraction Logic
        // -------------------------------------------------------------

        // We only extract Sinhala words, as processing the full English dictionary is probably out of scope 
        // or just too huge. If needed, we can regex for English. Here we match rough Sinhala characters.
        const SINHALA_REGEX = /[\u0D80-\u0DFF]+/g;

        const findWordRanges = (targetWords: string[]): Range[] => {
            const ranges: Range[] = [];
            const targetSet = new Set(targetWords);
            if (targetSet.size === 0) return ranges;

            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
            let node;

            while ((node = walker.nextNode())) {
                const text = node.nodeValue;
                if (!text || text.trim() === '') continue;

                // Skip script and style tags
                const parentName = node.parentElement?.tagName.toLowerCase();
                if (parentName === 'script' || parentName === 'style' || parentName === 'noscript') continue;

                let match;
                while ((match = SINHALA_REGEX.exec(text)) !== null) {
                    const word = match[0];
                    if (targetSet.has(word)) {
                        const range = new Range();
                        range.setStart(node, match.index);
                        range.setEnd(node, match.index + word.length);
                        ranges.push(range);
                    }
                }
            }
            return ranges;
        };

        const extractUniqueSinhalaWords = (): string[] => {
            const words = new Set<string>();
            const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
            let node;

            while ((node = walker.nextNode())) {
                const text = node.nodeValue;
                if (!text || text.trim() === '') continue;

                const parentName = node.parentElement?.tagName.toLowerCase();
                if (parentName === 'script' || parentName === 'style' || parentName === 'noscript') continue;

                let match;
                while ((match = SINHALA_REGEX.exec(text)) !== null) {
                    words.add(match[0]);
                }
            }
            return Array.from(words);
        };

        // Listen for requests from the SidePanel
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'REQUEST_WORDS') {
                const uniqueWords = extractUniqueSinhalaWords();
                sendResponse({ words: uniqueWords });
            } else if (message.action === 'APPLY_HIGHLIGHTS') {
                const headwords = message.words || [];
                const ranges = findWordRanges(headwords);

                if (ranges.length > 0 && typeof CSS !== 'undefined' && 'highlights' in CSS) {
                    try {
                        // Using CSS Custom Highlight API
                        // @ts-ignore
                        const highlight = new Highlight(...ranges);
                        // @ts-ignore
                        CSS.highlights.set('seld-match', highlight);
                    } catch (e) {
                        console.error("Failed to register highlights:", e);
                    }
                }
                sendResponse({ success: true, count: ranges.length });
            } else if (message.action === 'CLEAR_HIGHLIGHTS') {
                if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
                    // @ts-ignore
                    CSS.highlights.delete('seld-match');
                }
                sendResponse({ success: true });
            }
            return true;
        });
    }
});
