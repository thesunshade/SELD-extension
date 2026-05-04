export interface TooltipUIAction {
    id: string;
    label: string;
    icon: string;
    className?: string;
    onClick: () => void;
}

export class SelectionTooltipUI {
    private container: HTMLDivElement | null = null;
    private theme: string = 'system';

    public updateTheme(val: string) {
        this.theme = val;
        this.applyThemeClass();
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

    public show(x: number, y: number, actions: TooltipUIAction[]) {
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
                action.onClick();
            };
            content.appendChild(btn);
        });

        shadow.addEventListener('mousedown', (e) => {
            e.preventDefault();
            e.stopPropagation();
        });
        shadow.addEventListener('mouseup', (e) => e.stopPropagation());
        
        shadow.appendChild(style);
        shadow.appendChild(content);
        
        this.container.style.left = `${x}px`;
        this.container.style.top = `${y}px`;
        document.body.appendChild(this.container);
    }

    public destroy() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}
