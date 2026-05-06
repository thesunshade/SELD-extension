import { IS_MAJOR_UPDATE } from '@/utils/update-status';
import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';
import { onMessage, sendMessage } from '../utils/messaging';

export default defineBackground(() => {
    // Open welcome page on install or major update
    browser.runtime.onInstalled.addListener(({ reason }) => {
        if (reason === 'install' || (reason === 'update' && IS_MAJOR_UPDATE)) {
            browser.tabs.create({
                url: browser.runtime.getURL('/welcome.html'),
            });
        }
    });


    const isRestrictedPage = (url?: string): boolean => {
        if (!url) return true;
        const restrictedPrefixes = [
            'chrome://',
            'chrome-extension://',
            'about:',
            'edge://',
            'moz-extension://',
            'https://chrome.google.com/webstore',
            'https://addons.mozilla.org/'
        ];
        return restrictedPrefixes.some(prefix => url.startsWith(prefix));
    };

    const handleSidebarToggle = async (tabId?: number, url?: string) => {
        if (isRestrictedPage(url)) {
            // No longer using browser.notifications.create. 
            // Popup now handles this with a Tippy tooltip.
            return;
        }

        if (tabId) {
            try {
                await sendMessage('TOGGLE_SIDEBAR', undefined, tabId);
            } catch (e) {
                console.error("[SELD] Error sending TOGGLE_SIDEBAR from background:", e);
            }
        }
    };

    const MAX_CACHE_SIZE = 60;

    onMessage('GET_TTS_AUDIO', async ({ data }) => {
        const { text, tl } = data;
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${tl || 'si'}&client=tw-ob`;
        try {
            const cache = await caches.open('seld-tts-cache');
            let response = await cache.match(url);
            if (!response) {
                response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                await cache.put(url, response.clone());
                const keys = await cache.keys();
                if (keys.length > MAX_CACHE_SIZE) await cache.delete(keys[0]);
            }
            const buffer = await response.arrayBuffer();
            const bytes = new Uint8Array(buffer);
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
            }
            return { audioData: btoa(binary) };
        } catch (error: any) {
            console.error('[SELD] TTS fetch error:', error);
            return { error: String(error.message) };
        }
    });

    onMessage('REQUEST_TOGGLE_SIDEBAR', async () => {
        const tabs = await browser.tabs.query({ active: true, currentWindow: true });
        const tab = tabs[0];
        handleSidebarToggle(tab?.id, tab?.url);
    });

    onMessage('OPEN_EXPLORER', ({ data }) => {
        const { word, view } = data;
        const url = browser.runtime.getURL(`/dictionary.html?word=${encodeURIComponent(word || '')}${view ? `&view=${view}` : ''}`);
        browser.storage.session.get('explorerTabId').then((res) => {
            const explorerTabId = res.explorerTabId as number | undefined;
            if (explorerTabId != null) {
                browser.tabs.get(explorerTabId)
                    .then(() => browser.tabs.update(explorerTabId, { url, active: true }))
                    .catch(() => {
                        browser.tabs.create({ url }).then(tab => {
                            if (tab.id) browser.storage.session.set({ explorerTabId: tab.id });
                        });
                    });
            } else {
                browser.tabs.create({ url }).then(tab => {
                    if (tab.id) browser.storage.session.set({ explorerTabId: tab.id });
                });
            }
        });
    });

    onMessage('OPEN_URL', ({ data }) => {
        browser.tabs.create({ url: data.url });
    });

    // Track explorer tab closure
    browser.tabs.onRemoved.addListener((tabId) => {
        browser.storage.session.get('explorerTabId').then((res) => {
            if (res.explorerTabId === tabId) {
                browser.storage.session.remove('explorerTabId');
            }
        });
    });
});
