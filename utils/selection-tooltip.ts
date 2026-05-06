import { browser } from 'wxt/browser';
import { SelectionTooltipUI, TooltipUIAction } from './selection-tooltip-ui';

/**
 * Represents an action that can be performed on a text selection.
 * This treats "Copy" and "Play" as sibling features.
 */
interface SelectionAction {
    id: string;
    label: string;
    icon: string;
    onClick: (text: string) => void;
    className?: string;
}

class SelectionTooltip {
    private ui = new SelectionTooltipUI();
    private timeout: number | null = null;
    private threshold: number = 0;
    private enableTTS: boolean = true;
    private theme: string = 'system';
    
    private onPlayRequest: ((sel: Selection) => void) | null = null;
    private onStopRequest: (() => void) | null = null;

    constructor() {
        this.loadSettings();
        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local') {
                if (changes.theme) this.updateTheme(changes.theme.newValue as string);
                if (changes.seldSelectionCopyThreshold) this.updateThreshold(changes.seldSelectionCopyThreshold.newValue as number);
                if (changes.seldEnableSelectionTTS) this.updateEnableTTS(changes.seldEnableSelectionTTS.newValue as boolean);
            }
        });
    }

    public setCallbacks(onPlay: (sel: Selection) => void, onStop: () => void) {
        this.onPlayRequest = onPlay;
        this.onStopRequest = onStop;
    }

    private async loadSettings() {
        const res = await browser.storage.local.get({
            seldSelectionCopyThreshold: 0,
            seldEnableSelectionTTS: true,
            theme: 'system'
        }) as { seldSelectionCopyThreshold: number; seldEnableSelectionTTS: boolean; theme: string };
        this.threshold = res.seldSelectionCopyThreshold;
        this.enableTTS = res.seldEnableSelectionTTS;
        this.theme = res.theme;
    }

    updateThreshold(val: number) {
        this.threshold = val;
    }

    updateEnableTTS(val: boolean) {
        this.enableTTS = val;
    }

    updateTheme(val: string) {
        this.theme = val;
        this.ui.updateTheme(val);
    }

    /**
     * Entry point for handling page selections.
     * Evaluates which actions should be available and displays the tooltip.
     */
    handleSelection(explicitSelection?: Selection | null) {
        const selection = explicitSelection || window.getSelection();
        
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            this.destroy();
            return;
        }

        const text = selection.toString().trim();
        if (text.length === 0) {
            this.destroy();
            return;
        }

        // Heuristic: If selecting more than one word, assume a new passage and kill old player.
        if (text.split(/\s+/).length > 1) {
            this.onStopRequest?.();
        }

        // Build list of sibling actions
        const actions: SelectionAction[] = [];

        // TTS Action
        if (this.enableTTS) {
            actions.push({
                id: 'play',
                label: 'Play',
                className: 'btn-play',
                icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>',
                onClick: () => {
                    if (selection) this.onPlayRequest?.(selection);
                }
            });
        }

        // Copy Action
        if (this.threshold > 0 && text.length >= this.threshold) {
            actions.push({
                id: 'copy',
                label: 'Copy',
                className: 'btn-copy',
                icon: `
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                    </svg>
                `,
                onClick: async (t) => {
                    try {
                        await navigator.clipboard.writeText(t);
                    } catch (err) {
                        console.error("Failed to copy", err);
                    }
                }
            });
        }

        if (actions.length > 0) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            this.show(text, rect.left + rect.width / 2, rect.top + window.scrollY, actions);
        } else {
            this.destroy();
        }
    }

    private show(text: string, x: number, y: number, actions: SelectionAction[]) {
        this.destroy();
        
        const uiActions: TooltipUIAction[] = actions.map(a => ({
            id: a.id,
            label: a.label,
            icon: a.icon,
            className: a.className,
            onClick: () => {
                a.onClick(text);
                this.destroy();
            }
        }));

        this.ui.show(x, y, uiActions);
        this.timeout = window.setTimeout(() => this.destroy(), 5000);
    }

    destroy() {
        this.ui.destroy();
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
}

export const selectionTooltip = new SelectionTooltip();
