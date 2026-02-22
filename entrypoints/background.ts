import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
    // Allow the side panel to open when clicking the extension icon
    chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch((error: any) => console.error(error));

    // Listen for messages from the content script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'openSidePanel') {
            // Programmatic opening might require user gesture context.
            if (sender.tab && sender.tab.id && sender.tab.windowId) {
                chrome.sidePanel.open({ tabId: sender.tab.id, windowId: sender.tab.windowId }).catch((e) => {
                    console.log("Programmatic open requires active gesture, failing silently:", e);
                });
            }
        }
    });
});
