import '../assets/content.css';
import '../assets/sidebar.css';
import '../components/sidebar/App.css';
import { defineContentScript } from 'wxt/sandbox';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../components/sidebar/App';
import { extractUniqueSinhalaWords, SINHALA_REGEX } from '../utils/dom-highlights';
import { browser } from 'wxt/browser';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        let lastQueryTime = 0;

        let isSidebarOpen = false;
        let root: ReactDOM.Root | null = null;

        const initSidebar = () => {
            if (document.getElementById('seld-sidebar-root')) return;

            document.documentElement.classList.add('seld-active');
            document.body.classList.add('seld-active');

            // Wrap body content if not already wrapped
            if (!document.getElementById('seld-main-content')) {
                const container = document.createElement('div');
                container.id = 'seld-main-content';
                while (document.body.firstChild) {
                    const node = document.body.firstChild;
                    if (node instanceof HTMLElement && (node.id === 'seld-sidebar-root' || node.tagName === 'SCRIPT')) {
                        // skip
                    }
                    container.appendChild(node);
                }
                document.body.appendChild(container);
            }

            const sidebar = document.createElement('div');
            sidebar.id = 'seld-sidebar-root';
            document.body.appendChild(sidebar);

            // Mount React App
            root = ReactDOM.createRoot(sidebar);
            root.render(React.createElement(App));

            isSidebarOpen = true;
        };

        const destroySidebar = () => {
            document.documentElement.classList.remove('seld-active');
            document.body.classList.remove('seld-active');

            if (root) {
                root.unmount();
                root = null;
            }
            document.getElementById('seld-sidebar-root')?.remove();

            const container = document.getElementById('seld-main-content');
            if (container) {
                while (container.firstChild) {
                    document.body.appendChild(container.firstChild);
                }
                container.remove();
            }
            isSidebarOpen = false;
        };

        const toggleSidebar = () => {
            if (isSidebarOpen) {
                destroySidebar();
            } else {
                initSidebar();
            }
        };

        const handleSelection = (e: MouseEvent) => {
            if (!isSidebarOpen) return;
            if (e.target instanceof HTMLElement && e.target.closest('#seld-sidebar-root')) return;

            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const text = selection.toString().trim();

            if (text && text.length > 0 && text.length < 50) {
                const now = Date.now();
                if (now - lastQueryTime > 300) {
                    browser.storage.local.set({ 'seldSearchQuery': text });
                    lastQueryTime = now;
                }
            }
        };

        const handleCtrlClick = (e: MouseEvent) => {
            if (!e.ctrlKey) return;
            if (e.target instanceof HTMLElement && e.target.closest('#seld-sidebar-root')) return;

            browser.storage.local.get(['seldCtrlClickLookup']).then((result) => {
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
                    browser.storage.local.set({ 'seldSearchQuery': word });
                }
            });
        };


        window.addEventListener('mouseup', handleSelection);
        window.addEventListener('click', handleCtrlClick);

        // -------------------------------------------------------------
        // Listen for requests from the SidePanel
        // -------------------------------------------------------------
        browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
            if (message.action === 'REQUEST_WORDS') {
                const uniqueWords = extractUniqueSinhalaWords();
                sendResponse({ words: uniqueWords });
            } else if (message.action === 'TOGGLE_SIDEBAR') {
                toggleSidebar();
                sendResponse({ success: true });
            }
            return true;
        });

    }
});
