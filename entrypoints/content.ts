import { defineContentScript } from 'wxt/sandbox';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../components/sidebar/App';
import { browser } from 'wxt/browser';
import { setupSidebarEvents } from '../utils/selection-handler';

// Import CSS as strings using Vite's ?raw or ?inline
// Note: In WXT/Vite, ?inline usually works for CSS
import themeCss from '../assets/theme.css?inline';
import contentCss from '../assets/content.css?inline';
import sidebarMainCss from '../assets/sidebar.css?inline';
import appCss from '../components/sidebar/App.css?inline';

export default defineContentScript({
    matches: ['<all_urls>'],
    cssInjectionMode: 'manual',
    main(ctx) {
        let isSidebarOpen = false;
        let root: ReactDOM.Root | null = null;
        const STYLE_ID = 'seld-dynamic-styles';

        const updateSidebarPositionClass = (position: 'left' | 'right') => {
            document.documentElement.classList.remove('seld-pos-left', 'seld-pos-right');
            document.documentElement.classList.add(`seld-pos-${position}`);
        };

        const injectExtensionStyles = () => {
            if (document.getElementById(STYLE_ID)) return;
            const style = document.createElement('style');
            style.id = STYLE_ID;
            // Concatenate all CSS
            style.textContent = [themeCss, contentCss, sidebarMainCss, appCss].join('\n');
            document.head.appendChild(style);
        };

        const removeExtensionStyles = () => {
            document.getElementById(STYLE_ID)?.remove();
        };

        const initSidebar = async () => {
            if (document.getElementById('seld-sidebar-root')) return;

            // Inject styles only when sidebar is initiated
            injectExtensionStyles();

            // Load position and apply class
            const res = await browser.storage.local.get(['seldSidebarPosition', 'seldOverrideSinhalaFont']);
            updateSidebarPositionClass(res.seldSidebarPosition || 'right');

            // Apply font override if enabled and sidebar is being opened
            if (res.seldOverrideSinhalaFont) {
                applyFontOverride(true);
            }

            document.documentElement.classList.add('seld-active');
            document.body.classList.add('seld-active');

            // Wrap body content if not already wrapped
            if (!document.getElementById('seld-main-content')) {
                const container = document.createElement('div');
                container.id = 'seld-main-content';
                
                // Collect nodes first to avoid live collection issues
                const nodesToMove = Array.from(document.body.childNodes).filter(node => {
                    if (node instanceof HTMLElement && (
                        node.id === 'seld-sidebar-root' || 
                        node.tagName === 'SCRIPT' || 
                        node.tagName === 'STYLE' || 
                        node.id === STYLE_ID || 
                        node.id === FONT_STYLE_ID
                    )) {
                        return false;
                    }
                    return true;
                });

                nodesToMove.forEach(node => container.appendChild(node));
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
            document.documentElement.classList.remove('seld-pos-left', 'seld-pos-right');

            // Remove font override when sidebar is closed
            applyFontOverride(false);

            // Remove main extension styles
            removeExtensionStyles();

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

        // REMOVED: Initial check for font override on page load
        // This is now handled in initSidebar and storage listener only if sidebar is open

        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.seldOverrideSinhalaFont) {
                    const enabled = changes.seldOverrideSinhalaFont.newValue as boolean;
                    // Only apply/remove font override if sidebar is open or we are explicitly turning it off
                    if (isSidebarOpen || !enabled) {
                        applyFontOverride(enabled);
                    }
                }
                if (changes.seldSidebarPosition && isSidebarOpen) {
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
