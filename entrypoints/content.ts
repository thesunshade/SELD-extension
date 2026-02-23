import '../assets/content.css';
import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        let lastQueryTime = 0;

        let isSidebarOpen = false;
        let underlineEnabled = true;

        const handleSelection = () => {
            if (!isSidebarOpen) return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const text = selection.toString().trim();

            // Limit to 50 characters to avoid grabbing massive text blocks accidentally
            if (text && text.length > 0 && text.length < 50) {
                const now = Date.now();
                // Debounce simple lookups
                if (now - lastQueryTime > 300) {
                    chrome.storage.local.set({ 'seldSearchQuery': text });
                    // Attempt to open side panel
                    chrome.runtime.sendMessage({ action: 'openSidePanel' });
                    lastQueryTime = now;
                }
            }
        };

        const handleCtrlClick = (e: MouseEvent) => {
            if (!e.ctrlKey) return;

            chrome.storage.local.get(['seldCtrlClickLookup'], (result) => {
                if (result.seldCtrlClickLookup === false) return;

                // Attempt to find the word at the click point
                const range = document.caretRangeFromPoint(e.clientX, e.clientY);
                if (!range) return;

                const textNode = range.startContainer;
                if (textNode.nodeType !== Node.TEXT_NODE) return;

                const text = textNode.nodeValue || '';
                const offset = range.startOffset;

                // Find word boundaries (roughly Sinhala or English)
                const start = text.substring(0, offset).search(/[\u0D80-\u0DFFa-zA-Z]+$/);
                const end = text.substring(offset).search(/[^\u0D80-\u0DFFa-zA-Z]/);

                let word = '';
                if (start !== -1) {
                    const actualEnd = end === -1 ? text.length : offset + end;
                    word = text.substring(start, actualEnd).trim();
                }

                if (word && word.length < 50) {
                    chrome.storage.local.set({ 'seldSearchQuery': word });
                    chrome.runtime.sendMessage({ action: 'openSidePanel' });
                }
            });
        };

        window.addEventListener('mouseup', handleSelection);
        window.addEventListener('click', handleCtrlClick);

        // -------------------------------------------------------------
        // Highlight Extraction Logic
        // -------------------------------------------------------------
        // ... (SINHALA_REGEX and findWordRanges remain unchanged)

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

        // -------------------------------------------------------------
        // Highlight State and Reactive Logic
        // -------------------------------------------------------------
        let currentHeadwords: string[] = [];
        let mutationObserver: MutationObserver | null = null;
        let debounceTimer: number | null = null;

        const applyHighlights = () => {
            if (!isSidebarOpen || !underlineEnabled || currentHeadwords.length === 0) {
                if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
                    // @ts-ignore
                    CSS.highlights.delete('seld-match');
                }
                return;
            }

            const ranges = findWordRanges(currentHeadwords);
            if (ranges.length > 0 && typeof CSS !== 'undefined' && 'highlights' in CSS) {
                try {
                    // @ts-ignore
                    const highlight = new Highlight(...ranges);
                    // @ts-ignore
                    CSS.highlights.set('seld-match', highlight);
                } catch (e) {
                    console.error("Failed to register highlights:", e);
                }
            }
        };

        const setupObserver = () => {
            if (mutationObserver) return;

            mutationObserver = new MutationObserver((mutations) => {
                // Check if any added nodes contain text
                const hasTextChanges = mutations.some(m =>
                    m.addedNodes.length > 0 ||
                    m.type === 'characterData'
                );

                if (hasTextChanges) {
                    if (debounceTimer) clearTimeout(debounceTimer);
                    // @ts-ignore - window.setTimeout returns a number in browsers
                    debounceTimer = setTimeout(() => {
                        applyHighlights();
                    }, 500); // 500ms debounce to wait for DOM to settle
                }
            });

            mutationObserver.observe(document.body, {
                childList: true,
                subtree: true,
                characterData: true
            });
        };

        const clearAll = () => {
            currentHeadwords = [];
            if (debounceTimer) clearTimeout(debounceTimer);
            if (mutationObserver) {
                mutationObserver.disconnect();
                mutationObserver = null;
            }
            if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
                // @ts-ignore
                CSS.highlights.delete('seld-match');
            }
        };

        // Listen for requests from the SidePanel
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'REQUEST_WORDS') {
                const uniqueWords = extractUniqueSinhalaWords();
                sendResponse({ words: uniqueWords });
            } else if (message.action === 'APPLY_HIGHLIGHTS') {
                currentHeadwords = message.words || [];
                underlineEnabled = message.underlineEnabled !== false;
                applyHighlights();
                setupObserver();
                sendResponse({ success: true, count: currentHeadwords.length });
            } else if (message.action === 'CLEAR_HIGHLIGHTS') {
                clearAll();
                sendResponse({ success: true });
            } else if (message.action === 'SIDEPANEL_STATE') {
                isSidebarOpen = !!message.isOpen;
                if (!isSidebarOpen) {
                    clearAll();
                } else {
                    applyHighlights();
                }
                sendResponse({ success: true });
            }
            return true;
        });
    }
});
