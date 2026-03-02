import { defineBackground } from 'wxt/sandbox';
import { browser } from 'wxt/browser';

export default defineBackground(() => {
    // Action API fallback for MV2 (Firefox) vs MV3 (Chrome)
    const action = browser.action || (browser as any).browserAction;

    // Listen for clicking the extension icon
    action.onClicked.addListener(async (tab: any) => {
        if (!tab.id || !tab.url || tab.url.startsWith('chrome://') || tab.url.startsWith('about:')) return;

        try {
            await browser.tabs.sendMessage(tab.id, { action: 'TOGGLE_SIDEBAR' });
        } catch (e) {
            console.error("[SELD] Error sending TOGGLE_SIDEBAR:", e);
        }
    });


    // Listen for messages from the content script (keeping existing for now if needed, but cleaning up sidePanel)
    browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
        if (message.action === 'openSidePanel') {
            // This was for the old sidePanel, keeping it empty or removing it
            // since we are moving to custom injection.
        }
        return true;
    });
});


