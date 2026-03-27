import { defineContentScript } from 'wxt/sandbox';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from '../components/sidebar/App';
import { browser } from 'wxt/browser';
import { setupSidebarEvents } from '../utils/selection-handler';
import { createShadowRootUi } from 'wxt/client';
import type { ContentScriptUi } from 'wxt/client';
//
// Import CSS normally - WXT will bundle these into a single content.css file
import '../assets/theme.css';
import '../assets/content.css';
import '../assets/sidebar.css';
import '../components/sidebar/App.css';

export default defineContentScript({
    matches: ['<all_urls>'],
    cssInjectionMode: 'ui',
    main(ctx) {
        let isSidebarOpen = false;
        let ui: ContentScriptUi<ReactDOM.Root> | null = null;
        const STYLE_ID = 'seld-dynamic-styles';

        const updateSidebarPositionClass = (position: 'left' | 'right') => {
            document.documentElement.classList.remove('seld-pos-left', 'seld-pos-right');
            document.documentElement.classList.add(`seld-pos-${position}`);
        };

        const injectHostStyles = () => {
            if (document.getElementById(STYLE_ID)) return;
            const link = document.createElement('link');
            link.id = STYLE_ID;
            link.rel = 'stylesheet';
            link.href = browser.runtime.getURL('/content-scripts/content.css');
            document.head.appendChild(link);
        };

        const removeHostStyles = () => {
            document.getElementById(STYLE_ID)?.remove();
        };

        const destroySidebar = () => {
            document.documentElement.classList.remove('seld-active');
            document.body.classList.remove('seld-active');
            document.documentElement.classList.remove('seld-pos-left', 'seld-pos-right');

            // Remove font override when sidebar is closed
            applyFontOverride(false);

            // Remove host layout styles
            removeHostStyles();

            if (ui) {
                ui.remove();
                ui = null;
            }

            const container = document.getElementById('seld-main-content');
            if (container) {
                while (container.firstChild) {
                    document.body.appendChild(container.firstChild);
                }
                container.remove();
            }
            isSidebarOpen = false;
        };

        const initSidebar = async () => {
            if (ui) return;

            // Load position and apply class
            const res = await browser.storage.local.get(['seldSidebarPosition', 'seldOverrideSinhalaFont']);
            const rawPosition = res.seldSidebarPosition;
            const position = (rawPosition === 'left' || rawPosition === 'right') ? rawPosition : 'right';
            updateSidebarPositionClass(position);

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
                        node.id === 'seld-sidebar-root' || // Still check old ID just in case
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

            // Inject styles for host layout (push-aside)
            injectHostStyles();

            // Create Shadow Root UI
            ui = await createShadowRootUi(ctx, {
                name: 'seld-sidebar',
                position: 'overlay',
                anchor: 'body',
                append: 'last',
                onMount: (container) => {
                    // Create a wrapper for React inside the Shadow Root
                    const appRoot = document.createElement('div');
                    appRoot.id = 'seld-sidebar-root';
                    container.appendChild(appRoot);

                    const root = ReactDOM.createRoot(appRoot);
                    root.render(React.createElement(App, { onClose: destroySidebar }));
                    return root;
                },
                onRemove: (root) => {
                    root?.unmount();
                },
            });

            ui.mount();
            isSidebarOpen = true;
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
                const fontUrl = (browser.runtime.getURL as any)('assets/fonts/NotoSansSinhala-VariableFont_wdth,wght.ttf');
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

        const storageChangeHandler = (changes: { [key: string]: any }, namespace: string) => {
            if (ctx.isInvalid) return;
            if (namespace === 'local') {
                if (changes.seldOverrideSinhalaFont) {
                    const enabled = changes.seldOverrideSinhalaFont.newValue as boolean;
                    // Only apply/remove font override if sidebar is open or we are explicitly turning it off
                    if (isSidebarOpen || !enabled) {
                        applyFontOverride(enabled);
                    }
                }
                if (changes.seldSidebarPosition && isSidebarOpen) {
                    const nextPosition = changes.seldSidebarPosition.newValue;
                    if (nextPosition === 'left' || nextPosition === 'right') {
                        updateSidebarPositionClass(nextPosition);
                    }
                }
            }
        };
        browser.storage.onChanged.addListener(storageChangeHandler);

        const toggleSidebar = () => {
            if (isSidebarOpen) {
                destroySidebar();
            } else {
                initSidebar();
            }
        };

        setupSidebarEvents(() => isSidebarOpen, initSidebar, ctx);

        // -------------------------------------------------------------
        // Listen for requests from the SidePanel
        // -------------------------------------------------------------
        const messageHandler = (message: any, sender: any, sendResponse: (response?: any) => void) => {
            if (ctx.isInvalid) return true;
            if (message.action === 'TOGGLE_SIDEBAR') {
                toggleSidebar();
                sendResponse({ success: true });
            }
            return true;
        };
        browser.runtime.onMessage.addListener(messageHandler as any);

        // -------------------------------------------------------------
        // Handle context invalidation (extension update while tab is open)
        // -------------------------------------------------------------
        ctx.onInvalidated(() => {
            // Clean up sidebar and all injected DOM elements
            try {
                destroySidebar();
            } catch (e) {
                // Silently fail during invalidation cleanup
            }

            // Remove listeners that ctx doesn't auto-clean
            try {
                browser.storage.onChanged.removeListener(storageChangeHandler);
                browser.runtime.onMessage.removeListener(messageHandler as any);
            } catch (e) {
                // Already invalidated
            }

            // Show a small, non-intrusive reload banner using only inline styles
            // (extension CSS may no longer be loadable after invalidation)
            const BANNER_ID = 'seld-reload-banner';
            if (!document.getElementById(BANNER_ID)) {
                const banner = document.createElement('div');
                banner.id = BANNER_ID;
                banner.setAttribute('style', [
                    'position: fixed',
                    'bottom: 0',
                    'left: 0',
                    'right: 0',
                    'z-index: 2147483647',
                    'background: #1a1a2e',
                    'color: #e0e0e0',
                    'padding: 10px 16px',
                    'font: 14px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                    'display: flex',
                    'align-items: center',
                    'justify-content: center',
                    'gap: 12px',
                    'box-shadow: 0 -2px 8px rgba(0,0,0,0.3)',
                ].join('; '));

                const text = document.createElement('span');
                text.textContent = 'SELD Dictionary was updated. Please refresh the page to continue using it.';

                const dismissBtn = document.createElement('button');
                dismissBtn.textContent = '✕';
                dismissBtn.setAttribute('style', [
                    'background: transparent',
                    'border: 1px solid #555',
                    'color: #e0e0e0',
                    'border-radius: 4px',
                    'padding: 2px 8px',
                    'cursor: pointer',
                    'font-size: 14px',
                    'flex-shrink: 0',
                ].join('; '));
                dismissBtn.addEventListener('click', () => banner.remove());

                banner.appendChild(text);
                banner.appendChild(dismissBtn);

                if (document.body) {
                    document.body.appendChild(banner);
                    console.log("[SELD] Reload banner injected at bottom.");
                } else {
                    document.documentElement.appendChild(banner);
                }
            }
        });

    }
});
