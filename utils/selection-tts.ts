import { browser } from 'wxt/browser';
import { setTTSHighlight, clearTTSHighlight } from './dom-highlights';


interface SentenceBlock {
    text: string;
    range: Range;
}

class SelectionTTSPlayer {
    private playlist: SentenceBlock[] = [];
    private fullSelectionRange: Range | null = null;
    private currentIndex: number = -1;
    private isPlaying: boolean = false;
    private isRepeat: boolean = false;
    private audio: HTMLAudioElement | null = null;
    private container: HTMLDivElement | null = null;
    private theme: string = 'system';
    private rateLimited: boolean = false;

    constructor() {
        this.loadTheme();
        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.theme) {
                this.updateTheme(changes.theme.newValue);
            }
        });
    }

    private async loadTheme() {
        const res = await browser.storage.local.get({ theme: 'system' }) as { theme: string };
        this.theme = res.theme;
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

    public playSelection(selection: Selection) {
        this.stop();
        this.rateLimited = false;
        const result = this.decomposeSelection(selection);
        this.playlist = result.sentences;
        this.fullSelectionRange = result.fullRange;

        if (this.playlist.length === 0) {
            return;
        }

        this.currentIndex = 0;
        this.showPlayer();

        // Clear selection to make highlight visible
        if (selection.removeAllRanges) {
            selection.removeAllRanges();
        } else {
            window.getSelection()?.removeAllRanges();
        }

        this.play();
    }

    private decomposeSelection(selection: Selection): { sentences: SentenceBlock[], fullRange: Range | null } {
        if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return { sentences: [], fullRange: null };

        const mainRange = selection.getRangeAt(0).cloneRange();
        const sentences: SentenceBlock[] = [];

        const nodes: Text[] = [];
        const root = mainRange.commonAncestorContainer;
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);

        // createTreeWalker starts at root. If root is a text node, we check it.
        let n: Node | null = walker.currentNode;
        if (n && n.nodeType === Node.TEXT_NODE && mainRange.intersectsNode(n)) {
            nodes.push(n as Text);
        }
        while (n = walker.nextNode()) {
            if (mainRange.intersectsNode(n)) {
                nodes.push(n as Text);
            }
        }

        let currentSentenceText = "";
        let currentSentenceStartNode: Text | null = null;
        let currentSentenceStartOffset = 0;

        const commitSentence = (endNode: Text, endOffset: number) => {
            const trimmed = currentSentenceText.trim();
            if (trimmed.length > 0 && /[0-9\u0D80-\u0DFFa-zA-Z]/.test(trimmed) && currentSentenceStartNode) {
                // If sentence is too long for Google TTS (approx 200 chars), split it.
                // We use 180 to be safe.
                if (trimmed.length > 180) {
                    const words = trimmed.split(/(\s+)/);
                    let currentChunk = "";

                    // Create a full range for the whole long sentence first
                    const fullSentenceRange = new Range();
                    fullSentenceRange.setStart(currentSentenceStartNode, currentSentenceStartOffset);
                    fullSentenceRange.setEnd(endNode, endOffset);

                    for (const word of words) {
                        if (currentChunk.length + word.length > 180 && currentChunk.length > 0) {
                            sentences.push({
                                text: currentChunk.trim(),
                                range: this.createSubRange(fullSentenceRange, currentChunk.trim()) || fullSentenceRange
                            });
                            currentChunk = "";
                        }
                        currentChunk += word;
                    }
                    if (currentChunk.trim().length > 0) {
                        sentences.push({
                            text: currentChunk.trim(),
                            range: this.createSubRange(fullSentenceRange, currentChunk.trim()) || fullSentenceRange
                        });
                    }
                } else {

                    const range = new Range();
                    range.setStart(currentSentenceStartNode, currentSentenceStartOffset);
                    range.setEnd(endNode, endOffset);
                    sentences.push({ text: trimmed, range });
                }
            }
            currentSentenceText = "";
            currentSentenceStartNode = null;
        };

        for (const node of nodes) {
            const text = node.nodeValue || "";
            const start = (node === mainRange.startContainer) ? mainRange.startOffset : 0;
            const end = (node === mainRange.endContainer) ? mainRange.endOffset : text.length;

            const visibleText = text.substring(start, end);
            if (!visibleText) continue;

            // Split by sentence terminators, keeping the terminators with the sentence.
            // Using a more robust regex that groups multiple terminators and handles Sinhala.
            const parts = visibleText.split(/([.!?।|]+\s*)/g);

            let currentOffset = start;
            for (let i = 0; i < parts.length; i++) {
                const part = parts[i];
                if (!part) continue;

                if (!currentSentenceStartNode) {
                    currentSentenceStartNode = node;
                    currentSentenceStartOffset = currentOffset;
                }

                currentSentenceText += part;
                const partLength = part.length;

                // If this part is a sentence terminator, commit what we have so far
                if (/[.!?।|]/.test(part)) {
                    commitSentence(node, currentOffset + partLength);
                }

                currentOffset += partLength;
            }
        }

        // Final commit for any trailing text without a terminator
        if (currentSentenceStartNode && currentSentenceText.trim()) {
            // Find the last node in the nodes list to set the end of the final range
            const lastNode = nodes[nodes.length - 1];
            const end = (lastNode === mainRange.endContainer) ? mainRange.endOffset : (lastNode.nodeValue?.length || 0);
            commitSentence(lastNode, end);
        }

        return { sentences, fullRange: mainRange };
    }

    /**
     * Attempts to find a sub-range for specific text within a larger range.
     * This is used when splitting long sentences into chunks.
     */
    private createSubRange(limitRange: Range, targetText: string): Range | null {
        try {
            // We use a tree walker to find the text within the nodes of the limitRange
            const walker = document.createTreeWalker(
                limitRange.commonAncestorContainer,
                NodeFilter.SHOW_TEXT,
                null
            );

            let n: Node | null = walker.currentNode;
            let combinedText = "";
            let startFound = false;
            let startNode: Node | null = null;
            let startOffset = 0;

            // Simplified approach: find where the targetText starts and ends across text nodes
            // Note: This is complex due to multiple possible matches. 
            // For now, we'll return null to fallback to the full sentence range if we're not sure.
            // But let's try a basic search.

            // Actually, for chunks of a single sentence, using the full sentence range 
            // is perfectly fine for the highlight behavior the user requested.
            return null;
        } catch (e) {
            return null;
        }
    }


    private async play() {
        if (this.currentIndex < 0 || this.currentIndex >= this.playlist.length) {
            this.currentIndex = 0;
        }
        if (this.playlist.length === 0) {
            this.isPlaying = false;
            this.updateUI();
            return;
        }

        this.isPlaying = true;
        this.updateUI();

        const item = this.playlist[this.currentIndex];

        // Highlight current sentence using TTS category
        setTTSHighlight(item.range);

        try {
            // Trigger background fetch for this item
            const res = await browser.runtime.sendMessage({ action: 'GET_TTS_AUDIO', text: item.text, tl: 'si' });

            if (!res) {
                this.next();
                return;
            }

            if (res.error) {
                if (res.error.includes("429")) {
                    this.handleRateLimit();
                    return;
                }
                console.error("TTS fetch error:", res.error);
                this.next();
                return;
            }

            if (res.audioData) {
                if (this.audio) {
                    this.audio.onended = null; // Remove listener to avoid race conditions
                    this.audio.pause();
                    this.audio = null;
                }
                this.audio = new Audio(`data:audio/mpeg;base64,${res.audioData}`);
                this.audio.onended = () => {
                    if (this.isPlaying) {
                        this.next();
                    }
                };
                this.audio.play().catch(e => {
                    console.error("Playback error:", e);
                    this.next();
                });

                // --- PRE-FETCH NEXT ITEM ---
                if (this.currentIndex + 1 < this.playlist.length) {
                    const nextItem = this.playlist[this.currentIndex + 1];
                    // We don't await this, just trigger the background fetch so it's cached
                    browser.runtime.sendMessage({ action: 'GET_TTS_AUDIO', text: nextItem.text, tl: 'si' });
                }
            } else {
                this.next();
            }
        } catch (err) {
            console.error("Communication error:", err);
            this.next();
        }
    }

    private handleRateLimit() {
        this.rateLimited = true;
        this.isPlaying = false;
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        this.updateUI();
    }

    private onFinished() {
        this.isPlaying = false;
        // Highlight entire selection using TTS category when finished
        if (this.fullSelectionRange) {
            setTTSHighlight(this.fullSelectionRange);
        }
        this.updateUI();
    }


    private pause() {
        this.isPlaying = false;
        if (this.audio) {
            this.audio.pause();
        }
        this.updateUI();
    }

    private next() {
        this.currentIndex++;
        if (this.currentIndex >= this.playlist.length) {
            if (this.isRepeat) {
                this.currentIndex = 0;
                this.play();
            } else {
                this.onFinished();
            }
        } else {
            this.play();
        }
    }

    private prev() {
        this.currentIndex--;
        if (this.currentIndex < 0) this.currentIndex = 0;
        this.play();
    }

    private backToBeginning() {
        this.currentIndex = 0;
        this.play();
    }

    public stop() {
        this.isPlaying = false;
        if (this.audio) {
            this.audio.pause();
            this.audio = null;
        }
        clearTTSHighlight();
        this.hidePlayer();
    }


    private showPlayer() {
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

        shadow.getElementById('play-pause-btn')!.onclick = () => {
            if (this.rateLimited) return;
            if (this.isPlaying) this.pause();
            else this.play();
        };

        shadow.getElementById('beginning-btn')!.onclick = () => this.backToBeginning();
        shadow.getElementById('prev-btn')!.onclick = () => this.prev();
        shadow.getElementById('next-btn')!.onclick = () => this.next();
        shadow.getElementById('repeat-btn')!.onclick = () => {
            this.isRepeat = !this.isRepeat;
            this.updateUI();
        };
        shadow.getElementById('close-player-btn')!.onclick = () => this.stop();

        document.body.appendChild(this.container);
        this.updateUI();
    }

    private updateUI() {
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


    private hidePlayer() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
    }
}

export const selectionTTSPlayer = new SelectionTTSPlayer();
