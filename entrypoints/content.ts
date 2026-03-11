import '../assets/theme.css';
import '../assets/content.css';
import '../assets/sidebar.css';
import '../components/sidebar/App.css';
import { defineContentScript } from 'wxt/sandbox';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../components/sidebar/App';
import { browser } from 'wxt/browser';
import { setupSidebarEvents } from '../utils/selection-handler';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        let isSidebarOpen = false;
        let root: ReactDOM.Root | null = null;

        const updateSidebarPositionClass = (position: 'left' | 'right') => {
            document.documentElement.classList.remove('seld-pos-left', 'seld-pos-right');
            document.documentElement.classList.add(`seld-pos-${position}`);
        };

        const initSidebar = async () => {
            if (document.getElementById('seld-sidebar-root')) return;

            // Load position and apply class
            const res = await browser.storage.local.get(['seldSidebarPosition']);
            updateSidebarPositionClass(res.seldSidebarPosition || 'right');

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
            root.render(React.createElement(App, { onClose: destroySidebar }));

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

        const FONT_STYLE_ID = 'seld-font-override';
        const applyFontOverride = (enabled: boolean) => {
            let styleEl = document.getElementById(FONT_STYLE_ID);
            if (enabled) {
                if (!styleEl) {
                    styleEl = document.createElement('style');
                    styleEl.id = FONT_STYLE_ID;
                    document.head.appendChild(styleEl);
                }
                const runtime = browser.runtime as any;
                const fontUrl = runtime.getURL('assets/fonts/NotoSansSinhala-VariableFont_wdth,wght.ttf');
                styleEl.textContent = `
                    @font-face {
                        font-family: 'SeldNotoSansSinhala';
                        src: url('${fontUrl}') format('truetype');
                        font-weight: normal;
                        font-style: normal;
                        font-display: swap;
                    }
                    /* Aggressive override for everything EXCEPT the sidebar subtree */
                    *:not(#seld-sidebar-root):not(#seld-sidebar-root *) {
                        font-family: 'SeldNotoSansSinhala', 'Noto Sans Sinhala', sans-serif !important;
                    }
                `;
            } else {
                styleEl?.remove();
            }
        };

        // Initial check for font override
        browser.storage.local.get(['seldOverrideSinhalaFont']).then((res) => {
            if (res.seldOverrideSinhalaFont) {
                applyFontOverride(true);
            }
        });

        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.seldOverrideSinhalaFont) {
                    applyFontOverride(changes.seldOverrideSinhalaFont.newValue as boolean);
                }
                if (changes.seldSidebarPosition) {
                    updateSidebarPositionClass(changes.seldSidebarPosition.newValue as 'left' | 'right');
                }
            }
        });

        const toggleSidebar = () => {
            if (isSidebarOpen) {
                destroySidebar();
            } else {
                initSidebar();
            }
        };

        setupSidebarEvents(() => isSidebarOpen, initSidebar);

        // -------------------------------------------------------------
        // Listen for requests from the SidePanel
        // -------------------------------------------------------------
        browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
            if (message.action === 'TOGGLE_SIDEBAR') {
                toggleSidebar();
                sendResponse({ success: true });
            }
            return true;
        });

    }
});
