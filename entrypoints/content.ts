import { defineContentScript } from 'wxt/sandbox';

export default defineContentScript({
    matches: ['<all_urls>'],
    main() {
        let lastQueryTime = 0;

        const handleSelection = () => {
            const selection = window.getSelection();
            if (!selection || selection.rangeCount === 0) return;

            const text = selection.toString().trim();

            // Limit to 50 characters to avoid grabbing massive text blocks accidentally
            if (text && text.length > 0 && text.length < 50) {
                chrome.storage.local.get(['seldLookupEnabled'], (result) => {
                    // Default to true if not set, but user can toggle it
                    const isEnabled = result.seldLookupEnabled !== false;
                    if (!isEnabled) return;

                    const now = Date.now();
                    // Debounce simple lookups
                    if (now - lastQueryTime > 300) {
                        chrome.storage.local.set({ 'seldSearchQuery': text });
                        // Attempt to open side panel
                        chrome.runtime.sendMessage({ action: 'openSidePanel' });
                        lastQueryTime = now;
                    }
                });
            }
        };

        window.addEventListener('mouseup', handleSelection);
        // Double click often triggers mouseup, but we could also attach to dblclick if needed explicitly
    }
});
