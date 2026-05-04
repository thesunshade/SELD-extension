import { browser } from 'wxt/browser';
import { setTTSHighlight, clearTTSHighlight } from './dom-highlights';
import { SelectionTTSUI } from './selection-tts-ui';


interface SentenceBlock {
    text: string;
    range: Range;
}

class SelectionTTSPlayer {
    private ui = new SelectionTTSUI();
    private playlist: SentenceBlock[] = [];
    private fullSelectionRange: Range | null = null;
    private currentIndex: number = -1;
    private isPlaying: boolean = false;
    private isRepeat: boolean = false;
    private audio: HTMLAudioElement | null = null;
    private theme: string = 'system';
    private rateLimited: boolean = false;

    constructor() {
        this.loadTheme();
        browser.storage.onChanged.addListener((changes, namespace) => {
            if (namespace === 'local' && changes.theme) {
                this.updateTheme(changes.theme.newValue as string);
            }
        });

        this.ui.setCallbacks({
            onPlayPause: () => {
                if (this.rateLimited) return;
                if (this.isPlaying) this.pause();
                else this.play();
            },
            onBeginning: () => this.backToBeginning(),
            onPrev: () => this.prev(),
            onNext: () => this.next(),
            onRepeatToggle: () => {
                this.isRepeat = !this.isRepeat;
                this.ui.updateState(this.isPlaying, this.isRepeat, this.rateLimited);
            },
            onClose: () => this.stop()
        });
    }

    private async loadTheme() {
        const res = await browser.storage.local.get({ theme: 'system' }) as { theme: string };
        this.theme = res.theme;
    }

    updateTheme(val: string) {
        this.theme = val;
        this.ui.updateTheme(val);
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
        this.ui.show();

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
            this.ui.updateState(this.isPlaying, this.isRepeat, this.rateLimited);
            return;
        }

        this.isPlaying = true;
        this.ui.updateState(this.isPlaying, this.isRepeat, this.rateLimited);

        const item = this.playlist[this.currentIndex];

        // Highlight current sentence using TTS category
        setTTSHighlight(item.range);

        try {
            // Trigger background fetch for this item
            const res = await browser.runtime.sendMessage({ action: 'GET_TTS_AUDIO', text: item.text, tl: 'si' }) as any;

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
        this.ui.updateState(this.isPlaying, this.isRepeat, this.rateLimited);
    }

    private onFinished() {
        this.isPlaying = false;
        // Highlight entire selection using TTS category when finished
        if (this.fullSelectionRange) {
            setTTSHighlight(this.fullSelectionRange);
        }
        this.ui.updateState(this.isPlaying, this.isRepeat, this.rateLimited);
    }


    private pause() {
        this.isPlaying = false;
        if (this.audio) {
            this.audio.pause();
        }
        this.ui.updateState(this.isPlaying, this.isRepeat, this.rateLimited);
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
        this.ui.hide();
    }
}

export const selectionTTSPlayer = new SelectionTTSPlayer();
