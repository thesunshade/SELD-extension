import { defineBackground } from 'wxt/sandbox';

export default defineBackground(() => {
    const handleActionClick = (tab: Browser.tabs.Tab) => {
        if (tab.id) {
            browser.tabs.sendMessage(tab.id, { action: 'TOGGLE_PANEL' });
        }
    };

    const action = browser.action ?? (browser as any).browserAction;
    if (action?.onClicked) {
        action.onClicked.addListener(handleActionClick);
    }

    browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.action === 'openSidePanel') {
            if (sender.tab && sender.tab.id) {
                browser.tabs.sendMessage(sender.tab.id, { action: 'OPEN_PANEL' });
            }
        }
    });
});
