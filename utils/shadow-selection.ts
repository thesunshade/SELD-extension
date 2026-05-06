/**
 * Gets the current selection, correctly handling cases where the selection 
 * might be inside a Shadow Root (like the SELD sidebar).
 */
export function getSelectionInShadow(host: HTMLElement): Selection | null {
    // Standard approach for modern browsers (including Firefox 123+)
    const shadowRoot = host.shadowRoot;
    const hasGetSelection = !!(shadowRoot && 'getSelection' in shadowRoot);
    
    if (shadowRoot && hasGetSelection) {
        const sel = (shadowRoot as any).getSelection();
        if (sel && sel.rangeCount > 0) return sel;
    }

    return window.getSelection();
}
