import { browser } from 'wxt/browser';
import { selectionTTSPlayer } from './selection-tts';

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
    private container: HTMLDivElement | null = null;
    private timeout: number | null = null;
    private threshold: number = 0;
    private enableTTS: boolean = true;
    private theme: string = 'system';

    constructor() {
        this.loadSettings();
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
        if (this.container) {
            this.applyThemeClass();
        }
        selectionTTSPlayer.updateTheme(val);
    }

    private applyThemeClass() {
        if (!this.container) return;
        this.container.classList.remove('light-theme', 'dark-theme');
        let effectiveTheme = this.theme;
        if (effectiveTheme === 'system') {
            effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme';
        } else {
            effectiveTheme = `${effectiveTheme}-theme`;
        }
        this.container.classList.add(effectiveTheme);
    }

    /**
     * Entry point for handling page selections.
     * Evaluates which actions should be available and displays the tooltip.
     */
    handleSelection() {
        const selection = window.getSelection();
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
            selectionTTSPlayer.stop();
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
                    const sel = window.getSelection();
                    if (sel) selectionTTSPlayer.playSelection(sel);
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

        this.container = document.createElement('div');
        this.container.id = 'seld-selection-tooltip-root';
        this.container.className = 'seld-theme-vars';
        this.applyThemeClass();

        const shadow = this.container.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: absolute;
                z-index: 2147483647;
                pointer-events: none;
                transition: opacity 0.2s ease-out, transform 0.2s ease-out;
                
                --bg-panel: #ffffff;
                --bg-panel-secondary: #f3f4f6;
                --text-primary: #0f172a;
                --border-color: #e2e8f0;
                --accent: #0f172a;
                --accent-fg: #ffffff;
                --accent-hover: #1e293b;
            }

            :host(.dark-theme) {
                --bg-panel: rgb(15, 23, 42);
                --bg-panel-secondary: #1e293b;
                --text-primary: #f6f8fa;
                --border-color: #3c5379;
                --accent: #f8fafc;
                --accent-fg: #0f172a;
                --accent-hover: #e2e8f0;
            }

            .tooltip {
                pointer-events: auto;
                background: var(--bg-panel-secondary);
                color: var(--text-primary);
                border: 1px solid var(--border-color);
                border-radius: 6px;
                padding: 4px;
                box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 1px 3px rgba(0, 0, 0, 0.08);
                display: flex;
                align-items: center;
                transform: translate(-50%, calc(-100% - 8px));
                animation: seld-fade-in 0.1s ease-out;
                backdrop-filter: blur(8px);
                white-space: nowrap;
            }

            .btn {
                background: var(--accent);
                color: var(--accent-fg);
                border: none;
                padding: 4px 10px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                height: 28px;
            }

            .btn:first-child { border-top-left-radius: 4px; border-bottom-left-radius: 4px; }
            .btn:last-child { border-top-right-radius: 4px; border-bottom-right-radius: 4px; }
            .btn:only-child { border-radius: 4px; }

            .btn-play {
                background: var(--bg-panel-secondary);
                color: var(--text-primary);
                border-right: 1px solid var(--border-color);
            }

            .btn-play:hover { background: var(--border-color); }
            .btn-copy { /* Default accent style */ }

            .btn:hover:not(.btn-play) { background: var(--accent-hover); }
            .btn:active { transform: scale(0.96); }

            @keyframes seld-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;

        const content = document.createElement('div');
        content.className = 'tooltip';

        actions.forEach(action => {
            const btn = document.createElement('button');
            btn.className = `btn ${action.className || ''}`;
            btn.innerHTML = `${action.icon} ${action.label}`;
            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                action.onClick(text);
                this.destroy();
            };
            content.appendChild(btn);
        });

        shadow.addEventListener('mouseup', (e) => e.stopPropagation());
        
        shadow.appendChild(style);
        shadow.appendChild(content);
        
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
        document.body.appendChild(this.container);

        this.timeout = window.setTimeout(() => this.destroy(), 5000);
    }

    destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = null;
        }
    }
}

export const selectionTooltip = new SelectionTooltip();
