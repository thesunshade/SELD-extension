import { browser } from 'wxt/browser';

class SelectionCopyTooltip {
    private container: HTMLDivElement | null = null;
    private timeout: number | null = null;
    private threshold: number = 0;
    private theme: string = 'system';

    constructor() {
        this.loadSettings();
    }

    private async loadSettings() {
        const res = await browser.storage.local.get({
            seldSelectionCopyThreshold: 0,
            theme: 'system'
        }) as { seldSelectionCopyThreshold: number; theme: string };
        this.threshold = res.seldSelectionCopyThreshold;
        this.theme = res.theme;
    }

    updateThreshold(val: number) {
        this.threshold = val;
    }

    updateTheme(val: string) {
        this.theme = val;
        if (this.container) {
            this.applyThemeClass();
        }
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

    handleSelection() {
        if (this.threshold <= 0) return;

        const selection = window.getSelection();
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) {
            this.destroy();
            return;
        }

        const text = selection.toString().trim();
        if (text.length >= this.threshold) {
            const range = selection.getRangeAt(0);
            const rect = range.getBoundingClientRect();
            
            // Show tooltip above selection
            this.show(text, rect.left + rect.width / 2, rect.top + window.scrollY);
        } else {
            this.destroy();
        }
    }

    private show(text: string, x: number, y: number) {
        this.destroy();

        this.container = document.createElement('div');
        this.container.id = 'seld-copy-tooltip-root';
        this.container.className = 'seld-theme-vars';
        this.applyThemeClass();

        // Create Shadow Root for the tooltip to avoid host page CSS interference
        const shadow = this.container.attachShadow({ mode: 'open' });

        // Injected styles for the tooltip
        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: absolute;
                z-index: 2147483647;
                pointer-events: none;
                transition: opacity 0.2s ease-out, transform 0.2s ease-out;

                /* Light theme variables (default) */
                --text-primary: #0f172a;
                --text-secondary: #475569;
                --bg-panel: #ffffff;
                --bg-panel-secondary: #f3f4f6;
                --border-color: #e2e8f0;
                --accent: #0f172a;
                --accent-fg: #ffffff;
                --accent-hover: #1e293b;
            }

            :host(.dark-theme) {
                --bg-panel: rgb(15, 23, 42);
                --bg-panel-secondary: #1e293b;
                --text-primary: #f6f8fa;
                --text-secondary: #bfc8d4;
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
                gap: 0;
                font-family: inherit;
                font-size: 12px;
                transform: translate(-50%, calc(-100% - 8px));
                animation: seld-fade-in 0.1s ease-out;
                backdrop-filter: blur(8px);
                white-space: nowrap;
            }

            .btn {
                background: var(--accent);
                color: var(--accent-fg);
                border: none;
                border-radius: 4px;
                padding: 4px 10px;
                cursor: pointer;
                font-size: 13px;
                font-weight: 500;
                transition: all 0.15s ease;
                display: flex;
                align-items: center;
                gap: 6px;
                line-height: normal;
                height: 28px;
            }

            .btn:hover {
                background: var(--accent-hover);
            }

            .btn:active {
                transform: scale(0.96);
            }

            @keyframes seld-fade-in {
                from { opacity: 0; }
                to { opacity: 1; }
            }
        `;

        const content = document.createElement('div');
        content.className = 'tooltip';
        
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            Copy
        `;
        
        btn.onclick = async (e) => {
            e.preventDefault();
            e.stopPropagation();
            try {
                await navigator.clipboard.writeText(text);
                this.destroy();
            } catch (err) {
                console.error("Failed to copy", err);
            }
        };

        // Stop mouseup from atmospheric bubbling to the window
        shadow.addEventListener('mouseup', (e) => {
            e.stopPropagation();
        });

        content.appendChild(btn);
        
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

export const selectionCopyTooltip = new SelectionCopyTooltip();
