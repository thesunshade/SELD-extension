export interface TTSPlayerUICallbacks {
    onPlayPause: () => void;
    onBeginning: () => void;
    onPrev: () => void;
    onNext: () => void;
    onRepeatToggle: () => void;
    onClose: () => void;
}

export class SelectionTTSUI {
    private container: HTMLDivElement | null = null;
    private theme: string = 'system';
    private callbacks: TTSPlayerUICallbacks | null = null;

    private isPlaying = false;
    private isRepeat = false;
    private rateLimited = false;

    public setCallbacks(callbacks: TTSPlayerUICallbacks) {
        this.callbacks = callbacks;
    }

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

    public updateState(isPlaying: boolean, isRepeat: boolean, rateLimited: boolean) {
        this.isPlaying = isPlaying;
        this.isRepeat = isRepeat;
        this.rateLimited = rateLimited;
        this.renderState();
    }

    public show() {
        if (this.container) return;

        this.container = document.createElement('div');
        this.container.id = 'seld-tts-player-root';
        this.container.className = 'seld-theme-vars';
        this.applyThemeClass();

        const shadow = this.container.attachShadow({ mode: 'open' });

        const style = document.createElement('style');
        style.textContent = `
            :host {
                position: fixed;
                bottom: 20px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 2147483647;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                
                /* Theme variables */
                --bg-panel: #ffffff;
                --bg-panel-secondary: #f3f4f6;
                --text-primary: #0f172a;
                --text-secondary: #475569;
                --border-color: #e2e8f0;
                --accent: #0f172a;
                --accent-fg: #ffffff;
                --accent-hover: #1e293b;
                --error: #ef4444;
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

            .player {
                background: var(--bg-panel);
                border: 1px solid var(--border-color);
                border-radius: 12px;
                padding: 8px 12px;
                display: flex;
                flex-direction: column;
                gap: 4px;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
                backdrop-filter: blur(8px);
                animation: slide-up 0.3s ease-out;
            }

            .main-row {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            @keyframes slide-up {
                from { transform: translateY(20px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .controls {
                display: flex;
                align-items: center;
                gap: 4px;
            }

            .btn {
                background: transparent;
                border: none;
                border-radius: 6px;
                color: var(--text-primary);
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 6px;
                transition: all 0.2s;
            }

            .btn:hover {
                background: var(--bg-panel-secondary);
            }

            .btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }

            .btn svg {
                width: 18px;
                height: 18px;
            }

            .btn-main {
                background: var(--accent);
                color: var(--accent-fg);
                width: 32px;
                height: 32px;
                border-radius: 50%;
            }

            .btn-active {
                color: #29ce00ff;
            }

            .divider {
                width: 1px;
                height: 20px;
                background: var(--border-color);
                margin: 0 4px;
            }

            .status-msg {
                font-size: 11px;
                color: var(--text-secondary);
                text-align: center;
                padding: 0 4px;
            }

            .error-msg {
                color: var(--error);
                font-weight: 500;
            }

            .close-btn:hover {
                color: #ef4444;
            }
        `;

        const player = document.createElement('div');
        player.className = 'player';

        player.innerHTML = `
            <div class="main-row">
                <div class="controls">
                    <button class="btn" id="beginning-btn" title="Back to beginning">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"></polygon><line x1="5" y1="19" x2="5" y2="5"></line></svg>
                    </button>
                    <button class="btn" id="prev-btn" title="Previous sentence">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 19 2 12 11 5 11 19"></polygon><polygon points="22 19 13 12 22 5 22 19"></polygon></svg>
                    </button>
                    <button class="btn btn-main" id="play-pause-btn">
                        <svg id="play-icon" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                        <svg id="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display:none"><rect x="6" y="4" width="4" height="16"></rect><rect x="14" y="4" width="4" height="16"></rect></svg>
                    </button>
                    <button class="btn" id="next-btn" title="Next sentence">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 19 22 12 13 5 13 19"></polygon><polygon points="2 19 11 12 2 5 2 19"></polygon></svg>
                    </button>
                </div>
                <div class="divider"></div>
                <button class="btn" id="repeat-btn" title="Toggle repeat">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
                </button>
                <button class="btn close-btn" id="close-player-btn" title="Close">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                </button>
            </div>
            <div id="status-row" class="status-msg" style="display:none"></div>
        `;

        shadow.appendChild(style);
        shadow.appendChild(player);

        shadow.getElementById('play-pause-btn')!.onclick = () => this.callbacks?.onPlayPause();
        shadow.getElementById('beginning-btn')!.onclick = () => this.callbacks?.onBeginning();
        shadow.getElementById('prev-btn')!.onclick = () => this.callbacks?.onPrev();
        shadow.getElementById('next-btn')!.onclick = () => this.callbacks?.onNext();
        shadow.getElementById('repeat-btn')!.onclick = () => this.callbacks?.onRepeatToggle();
        shadow.getElementById('close-player-btn')!.onclick = () => this.callbacks?.onClose();

        document.body.appendChild(this.container);
        this.renderState();
    }

    private renderState() {
        if (!this.container) return;
        const shadow = this.container.shadowRoot;
        if (!shadow) return;

        const playIcon = shadow.getElementById('play-icon');
        const pauseIcon = shadow.getElementById('pause-icon');
        if (playIcon && pauseIcon) {
            playIcon.style.display = this.isPlaying ? 'none' : 'block';
            pauseIcon.style.display = this.isPlaying ? 'block' : 'none';
        }

        const repeatBtn = shadow.getElementById('repeat-btn');
        if (repeatBtn) {
            if (this.isRepeat) repeatBtn.classList.add('btn-active');
            else repeatBtn.classList.remove('btn-active');
        }

        const statusRow = shadow.getElementById('status-row');
        if (statusRow) {
            if (this.rateLimited) {
                statusRow.textContent = "Google TTS rate limit reached. Please wait a few minutes.";
                statusRow.classList.add('error-msg');
                statusRow.style.display = 'block';
            } else {
                statusRow.style.display = 'none';
            }
        }

        const playBtn = shadow.getElementById('play-pause-btn') as HTMLButtonElement;
        if (playBtn) playBtn.disabled = this.rateLimited;

        const navBtns = ['beginning-btn', 'prev-btn', 'next-btn'];
        navBtns.forEach(id => {
            const btn = shadow.getElementById(id) as HTMLButtonElement;
            if (btn) btn.disabled = !this.isPlaying || this.rateLimited;
        });
    }

    public hide() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}
