import '../assets/content.css';
import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
    matches: ['<all_urls>'],
    runAt: 'document_end',
    main(ctx) {
        let lastQueryTime = 0;
        let underlineEnabled = true;
        let currentHeadwords: string[] = [];
        let mutationObserver: MutationObserver | null = null;
        let debounceTimer: ReturnType<typeof setTimeout> | null = null;
        let panelEl: HTMLDivElement | null = null;
        let iframeEl: HTMLIFrameElement | null = null;
        let isResizing = false;
        let panelWidth = 360;

        const MIN_WIDTH = 250;
        const MAX_WIDTH = 600;

        const createPanel = async () => {
            if (panelEl) return;

            const storedWidth = await browser.storage.local.get(['seldPanelWidth']);
            panelWidth = (storedWidth.seldPanelWidth as number) || 360;
            document.documentElement.style.setProperty('--seld-panel-width', `${panelWidth}px`);

            panelEl = document.createElement('div');
            panelEl.id = 'seld-panel';

            const resizeHandle = document.createElement('div');
            resizeHandle.className = 'seld-resize-handle';

            iframeEl = document.createElement('iframe');
            iframeEl.src = browser.runtime.getURL('/panel.html');
            iframeEl.className = 'seld-iframe';

            panelEl.appendChild(resizeHandle);
            panelEl.appendChild(iframeEl);
            document.body.appendChild(panelEl);

            resizeHandle.addEventListener('mousedown', startResize);
            resizeHandle.addEventListener('mouseenter', () => {
                resizeHandle.style.background = 'rgba(9, 105, 218, 0.3)';
            });
            resizeHandle.addEventListener('mouseleave', () => {
                if (!isResizing) resizeHandle.style.background = 'transparent';
            });
        };

        const startResize = (e: MouseEvent) => {
            e.preventDefault();
            isResizing = true;
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
            const handle = document.querySelector('.seld-resize-handle') as HTMLDivElement;
            if (handle) handle.style.background = 'rgba(9, 105, 218, 0.5)';
            document.addEventListener('mousemove', doResize);
            document.addEventListener('mouseup', stopResize);
        };

        const doResize = (e: MouseEvent) => {
            if (!isResizing) return;
            const newWidth = window.innerWidth - e.clientX;
            panelWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
            document.documentElement.style.setProperty('--seld-panel-width', `${panelWidth}px`);
        };

        const stopResize = async () => {
            if (!isResizing) return;
            isResizing = false;
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            const handle = document.querySelector('.seld-resize-handle') as HTMLDivElement;
            if (handle) handle.style.background = 'transparent';
            document.removeEventListener('mousemove', doResize);
            document.removeEventListener('mouseup', stopResize);
            await browser.storage.local.set({ seldPanelWidth: panelWidth });
        };

        const showPanel = async () => {
            await createPanel();
            if (panelEl) {
                panelEl.style.display = 'flex';
                document.documentElement.classList.add('seld-active');
                document.body.classList.add('seld-active');
            }
        };

        const hidePanel = () => {
            if (panelEl) {
                panelEl.style.display = 'none';
                document.documentElement.classList.remove('seld-active');
                document.body.classList.remove('seld-active');
            }
        };

        const togglePanel = () => {
            if (panelEl && panelEl.style.display !== 'none') {
                hidePanel();
            } else {
                showPanel();
            }
        };

        const sendToPanel = (message: any) => {
            if (iframeEl?.contentWindow) {
                iframeEl.contentWindow.postMessage(message, '*');
            }
        };

        const handleHighlights = async () => {
            if (!panelEl || panelEl.style.display === 'none' || !underlineEnabled) {
                if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
                    CSS.highlights.delete('seld-match');
                }
                return;
            }

            const uniqueWords = extractUniqueSinhalaWords();
            if (uniqueWords.length === 0) return;

            const stardict = await import('../utils/stardict');
            const exactMatches = await stardict.stardict.findExistingWords(uniqueWords);
            currentHeadwords = exactMatches;
            applyHighlights();
        };

        browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.action === 'TOGGLE_PANEL') {
                togglePanel();
                sendResponse({ success: true });
            } else if (message.action === 'OPEN_PANEL') {
                showPanel();
                sendResponse({ success: true });
            } else if (message.action === 'CLOSE_PANEL') {
                hidePanel();
                sendResponse({ success: true });
            }
            return true;
        });

        window.addEventListener('message', async (event) => {
            if (!event.data || typeof event.data !== 'object') return;
            if (event.source !== iframeEl?.contentWindow) return;

            const { action, ...data } = event.data;

            switch (action) {
                case 'GET_SETTINGS': {
                    const res = await browser.storage.local.get(['theme', 'fontSize', 'seldCtrlClickLookup', 'seldUnderlineWords', 'listHeight']);
                    sendToPanel({ action: 'SETTINGS_RESPONSE', ...res });
                    break;
                }
                case 'SAVE_SETTING': {
                    await browser.storage.local.set({ [data.key]: data.value });
                    break;
                }
                case 'SAVE_SESSION': {
                    await browser.storage.session.set(data);
                    break;
                }
                case 'SIDEPANEL_OPEN': {
                    handleHighlights();
                    break;
                }
                case 'SIDEPANEL_CLOSE': {
                    clearAll();
                    break;
                }
                case 'REQUEST_HIGHLIGHTS': {
                    underlineEnabled = data.underlineEnabled !== false;
                    if (underlineEnabled) {
                        handleHighlights();
                    } else {
                        if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
                            CSS.highlights.delete('seld-match');
                        }
                    }
                    break;
                }
            }
        });

        const handleSelection = async () => {
            if (!panelEl || panelEl.style.display === 'none') return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const text = selection.toString().trim();

            if (text && text.length > 0 && text.length < 50) {
                const now = Date.now();
                if (now - lastQueryTime > 300) {
                    await browser.storage.local.set({ 'seldSearchQuery': text });
                    sendToPanel({ action: 'SEARCH_QUERY', query: text });
                    showPanel();
                    lastQueryTime = now;
                }
            }
        };

        const handleCtrlClick = async (e: MouseEvent) => {
            if (!e.ctrlKey) return;

            const result = await browser.storage.local.get(['seldCtrlClickLookup']);
            if (result.seldCtrlClickLookup === false) return;

            const range = document.caretRangeFromPoint(e.clientX, e.clientY);
            if (!range) return;

            const textNode = range.startContainer;
            if (textNode.nodeType !== Node.TEXT_NODE) return;

            const text = textNode.nodeValue || '';
            const offset = range.startOffset;

            const start = text.substring(0, offset).search(/[\u0D80-\u0DFFa-zA-Z]+$/);
            const end = text.substring(offset).search(/[^\u0D80-\u0DFFa-zA-Z]/);

            let word = '';
            if (start !== -1) {
                const actualEnd = end === -1 ? text.length : offset + end;
                word = text.substring(start, actualEnd).trim();
            }

            if (word && word.length < 50) {
                await browser.storage.local.set({ 'seldSearchQuery': word });
                sendToPanel({ action: 'SEARCH_QUERY', query: word });
                showPanel();
            }
        };

        window.addEventListener('mouseup', handleSelection);
        window.addEventListener('click', handleCtrlClick);

        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.seldSearchQuery && changes.seldSearchQuery.newValue) {
                const newQuery = changes.seldSearchQuery.newValue as string;
                sendToPanel({ action: 'SEARCH_QUERY', query: newQuery });
                showPanel();
            }
        });

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

                const parentName = node.parentElement?.tagName.toLowerCase();
                if (parentName === 'script' || parentName === 'style' || parentName === 'noscript') continue;

                let match;
                SINHALA_REGEX.lastIndex = 0;
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
                SINHALA_REGEX.lastIndex = 0;
                while ((match = SINHALA_REGEX.exec(text)) !== null) {
                    words.add(match[0]);
                }
            }
            return Array.from(words);
        };

        const applyHighlights = () => {
            if (!underlineEnabled || currentHeadwords.length === 0) {
                if (typeof CSS !== 'undefined' && 'highlights' in CSS) {
                    CSS.highlights.delete('seld-match');
                }
                return;
            }

            const ranges = findWordRanges(currentHeadwords);
            if (ranges.length > 0 && typeof CSS !== 'undefined' && 'highlights' in CSS) {
                try {
                    const highlight = new Highlight(...ranges);
                    CSS.highlights.set('seld-match', highlight);
                } catch (e) {
                    console.error("Failed to register highlights:", e);
                }
            }
        };

        const setupObserver = () => {
            if (mutationObserver) return;

            mutationObserver = new MutationObserver((mutations) => {
                const hasTextChanges = mutations.some(m =>
                    m.addedNodes.length > 0 ||
                    m.type === 'characterData'
                );

                if (hasTextChanges) {
                    if (debounceTimer) clearTimeout(debounceTimer);
                    debounceTimer = setTimeout(() => {
                        handleHighlights();
                    }, 500);
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
                CSS.highlights.delete('seld-match');
            }
        };

        setupObserver();
    }
});
