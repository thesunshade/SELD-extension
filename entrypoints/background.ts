import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';

export default defineBackground(() => {
    // Open welcome page on install or update
    browser.runtime.onInstalled.addListener(({ reason }) => {
        if (reason === 'install' || reason === 'update') {
            browser.tabs.create({
                url: chrome.runtime.getURL('/extension-pages/welcome.html'),
            });
        }
    });


    // Listen for messages from the content script (keeping existing for now if needed, but cleaning up sidePanel)
    browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
        if (message.action === 'GET_TTS_AUDIO') {
            const { text, tl } = message;
            const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=${tl || 'si'}&client=tw-ob`;

            fetch(url)
                .then(response => {
                    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                    return response.arrayBuffer();
                })
                .then(buffer => {
                    // Convert ArrayBuffer to Base64
                    const base64 = btoa(
                        new Uint8Array(buffer)
                            .reduce((data, byte) => data + String.fromCharCode(byte), '')
                    );
                    sendResponse({ audioData: base64 });
                })
                .catch(error => {
                    console.error("[SELD] TTS fetch error:", error);
                    sendResponse({ error: error.message });
                });
            return true; // Keep message channel open for async response
        }
        return true;
    });

});


