import React, { useState, useEffect, useRef } from 'react';
import { stardict, IndexEntry, StructuredDefinition } from '../../utils/stardict';
import { extractUniqueSinhalaWords, applyHighlights } from '../../utils/dom-highlights';
import { transliterateSinhala } from '../../utils/transliterate';
import { browser } from 'wxt/browser';

type View = 'search' | 'settings' | 'info';
type Theme = 'light' | 'dark' | 'system';

function App() {
    const [view, setView] = useState<View>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IndexEntry[]>([]);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [definition, setDefinition] = useState<StructuredDefinition[] | null>(null);

    // Settings state
    const [theme, setTheme] = useState<Theme>('system');
    const [fontSize, setFontSize] = useState(100);
    const [ctrlClickLookup, setCtrlClickLookup] = useState(true);
    const [underlineDictionaryWords, setUnderlineDictionaryWords] = useState(true);
    const [autoPlayTTS, setAutoPlayTTS] = useState(false);
    const [overrideSinhalaFont, setOverrideSinhalaFont] = useState(false);

    // Transliteration settings
    const [transliterateHeadwords, setTransliterateHeadwords] = useState(false);
    const [transliterateResults, setTransliterateResults] = useState(false);
    const [transliterateDefinitions, setTransliterateDefinitions] = useState(false);

    const autoPlayTTSRef = useRef(false);
    const [showToast, setShowToast] = useState(false);
    const [toastMessage, setToastMessage] = useState('');
    const [listHeight, setListHeight] = useState(35); // percentage
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const selectedRef = useRef<HTMLDivElement>(null);
    const isResizingVertical = useRef(false);
    const isResizingSidebar = useRef(false);

    // History navigation state
    const [history, setHistory] = useState<string[]>([]);
    const historyIndex = useRef(-1);
    const isNavigatingHistory = useRef(false);

    const isInitialized = useRef(false);

    // Sidebar State Notification
    useEffect(() => {
        // No longer need to send messages to background/content since we ARE in the content script
        // But we might want to tell the content script state directly if it was watching.
        return () => {
            // Cleanup highlights when closed
            applyHighlights([], false);
        };
    }, []);

    // Dictionary Highlight Logic
    useEffect(() => {
        let isActive = true;

        const handleHighlights = async () => {
            try {
                // Now directly calling the domestic function
                const uniqueWords = extractUniqueSinhalaWords();
                if (!isActive) return;

                // Find exact matches
                const exactMatches = await stardict.findExistingWords(uniqueWords);
                if (!isActive) return;

                // Directly apply highlights
                applyHighlights(exactMatches, underlineDictionaryWords);

            } catch (e) {
                console.error("Highlighting error in App.tsx:", e);
            }
        };

        handleHighlights();

        // Content scripts don't have browser.tabs access.
        // We rely on the parent (content.ts) or a MutationObserver to re-trigger if needed.
        // For now, let's trigger on a simple interval or rely on the initial load.
        // Re-run highlights when DOM changes (simplified)
        const observer = new MutationObserver(() => {
            handleHighlights();
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });

        return () => {
            isActive = false;
            observer.disconnect();
        };
    }, [underlineDictionaryWords]);


    useEffect(() => {
        // Load settings
        browser.storage.local.get([
            'theme', 'fontSize', 'seldCtrlClickLookup', 'seldUnderlineWords',
            'seldAutoPlayTTS', 'seldOverrideSinhalaFont', 'listHeight', 'seldSearchQuery', 'sidebarWidth',
            'seldTransliterateHeadwords', 'seldTransliterateResults', 'seldTransliterateDefinitions'
        ]).then((res) => {
            if (res.theme) setTheme(res.theme as Theme);
            if (res.fontSize) setFontSize(res.fontSize as number);
            if (res.seldCtrlClickLookup !== undefined) setCtrlClickLookup(res.seldCtrlClickLookup as boolean);
            if (res.seldUnderlineWords !== undefined) setUnderlineDictionaryWords(res.seldUnderlineWords as boolean);
            if (res.seldAutoPlayTTS !== undefined) { setAutoPlayTTS(res.seldAutoPlayTTS as boolean); autoPlayTTSRef.current = res.seldAutoPlayTTS as boolean; }
            if (res.seldOverrideSinhalaFont !== undefined) setOverrideSinhalaFont(res.seldOverrideSinhalaFont as boolean);
            if (res.seldTransliterateHeadwords !== undefined) setTransliterateHeadwords(res.seldTransliterateHeadwords as boolean);
            if (res.seldTransliterateResults !== undefined) setTransliterateResults(res.seldTransliterateResults as boolean);
            if (res.seldTransliterateDefinitions !== undefined) setTransliterateDefinitions(res.seldTransliterateDefinitions as boolean);
            if (res.sidebarWidth) setSidebarWidth(res.sidebarWidth as number);
            if (res.listHeight) setListHeight(res.listHeight as number);

            if (res.seldSearchQuery) {
                const q = res.seldSearchQuery as string;
                setQuery(q);
                handleSearch(q);
                setView('search');
                browser.storage.local.remove('seldSearchQuery');
            }
            isInitialized.current = true;
        });

        const handleStorageChange = (changes: any, namespace: string) => {
            if (namespace === 'local' && changes.seldSearchQuery && changes.seldSearchQuery.newValue) {
                const newQuery = changes.seldSearchQuery.newValue;
                setQuery(newQuery);
                handleSearch(newQuery);
                setView('search');
                browser.storage.local.remove('seldSearchQuery');
            }
        };
        browser.storage.onChanged.addListener(handleStorageChange);
        return () => browser.storage.onChanged.removeListener(handleStorageChange);
    }, []);


    useEffect(() => {
        if (isInitialized.current) {
            browser.storage.local.set({ view, query, selectedWord });
        }
    }, [view, query, selectedWord]);


    useEffect(() => {
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedWord]);

    // Apply theme class to container
    const getThemeClass = () => {
        if (theme === 'system') {
            return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-theme' : 'light-theme';
        }
        return theme === 'dark' ? 'dark-theme' : 'light-theme';
    };

    const themeClass = getThemeClass();

    useEffect(() => {
        const updateTheme = () => {
            const currentClass = getThemeClass();
            // Don't set document.body className - it leaks to the host page
            // Instead, we rely on the theme class on our own container
        };
        updateTheme();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', updateTheme);
        return () => mediaQuery.removeEventListener('change', updateTheme);
    }, [theme]);

    useEffect(() => {
        // Update the CSS variable for the sidebar width
        document.documentElement.style.setProperty('--seld-panel-width', `${sidebarWidth}px`);
    }, [sidebarWidth]);

    useEffect(() => {
        const handleGlobalMouseMove = (e: MouseEvent) => {
            if (isResizingVertical.current) {
                const containerHeight = window.innerHeight;
                const newHeight = (e.clientY / containerHeight) * 100;
                if (newHeight > 10 && newHeight < 80) {
                    setListHeight(newHeight);
                    chrome.storage.local.set({ listHeight: newHeight });
                }
            }

            if (isResizingSidebar.current) {
                const width = window.innerWidth - e.clientX;
                if (width > 200 && width < window.innerWidth * 0.8) {
                    setSidebarWidth(width);
                    chrome.storage.local.set({ sidebarWidth: width });
                }
            }
        };

        const handleGlobalMouseUp = () => {
            isResizingVertical.current = false;
            isResizingSidebar.current = false;
            document.body.style.userSelect = "";
            document.body.style.cursor = "";
        };

        window.addEventListener('mousemove', handleGlobalMouseMove);
        window.addEventListener('mouseup', handleGlobalMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleGlobalMouseMove);
            window.removeEventListener('mouseup', handleGlobalMouseUp);
        };
    }, []);


    const sanitizeSearchQuery = (q: string) => {
        // Sanitize leading and trailing whitespace and punctuation: . , ; : ' " ‘ ’ “ ” - – —
        // Using Unicode codepoints for robustness as requested
        return q.replace(/^[\u002E\u002C\u003B\u003A\u0027\u0022\u2018\u2019\u201C\u201D\u002D\u2013\u2014\s]+|[\u002E\u002C\u003B\u003A\u0027\u0022\u2018\u2019\u201C\u201D\u002D\u2013\u2014\s]+$/g, '');
    };

    const handleSearch = async (q: string) => {
        const sanitized = sanitizeSearchQuery(q);
        if (!sanitized) {
            setResults([]);
            setDefinition(null);
            setSelectedWord(null);
            return;
        }
        const matches = await stardict.searchWords(sanitized, 30);
        setResults(matches);
        const exact = matches.find(m => m.word === sanitized) || matches.find(m => m.isSynthesizedMatch);
        if (exact) {
            handleSelectWord(exact.word);
        } else {
            setDefinition(null);
            setSelectedWord(null);
        }
    };

    const handleSelectWord = async (word: string) => {
        setSelectedWord(word);
        const def = await stardict.getDefinition(word);
        setDefinition(def);
        if (autoPlayTTSRef.current) handleSpeak(word);

        // Push to history unless we're navigating via back/forward
        if (!isNavigatingHistory.current) {
            setHistory(prev => {
                // Truncate any forward history
                const truncated = prev.slice(0, historyIndex.current + 1);
                // Don't add duplicates if the same word is already the latest
                if (truncated.length > 0 && truncated[truncated.length - 1] === word) {
                    return truncated;
                }
                const updated = [...truncated, word];
                historyIndex.current = updated.length - 1;
                return updated;
            });
        }
    };

    const goBack = async () => {
        if (historyIndex.current <= 0) return;
        historyIndex.current -= 1;
        const word = history[historyIndex.current];
        isNavigatingHistory.current = true;
        setQuery(word);
        await handleSearch(word);
        await handleSelectWord(word);
        isNavigatingHistory.current = false;
    };

    const goForward = async () => {
        if (historyIndex.current >= history.length - 1) return;
        historyIndex.current += 1;
        const word = history[historyIndex.current];
        isNavigatingHistory.current = true;
        setQuery(word);
        await handleSearch(word);
        await handleSelectWord(word);
        isNavigatingHistory.current = false;
    };

    const handleSpeak = (text: string) => {
        if (!text) return;

        browser.runtime.sendMessage({ action: 'GET_TTS_AUDIO', text, tl: 'si' })
            .then((response: any) => {

                if (response.error) {
                    console.error("TTS Proxy error:", response.error);
                    return;
                }
                if (response.audioData) {
                    const audio = new Audio(`data:audio/mpeg;base64,${response.audioData}`);
                    audio.play().catch(e => console.error("TTS Playback error:", e));
                }
            })
            .catch(e => console.error("Error communicating with background for TTS:", e));
    };

    const handleCopy = async (targetWord: string, specificDefBlock?: string | string[]) => {
        if (!targetWord || !specificDefBlock) return;

        try {
            // Helper to strip HTML tags and attempt to preserve block structure for plain text
            const stripHtml = (html: string) => {
                let textWithNewlines = html
                    .replace(/<hr[^>]*>/gi, '\n\n')
                    .replace(/<br[^>]*>/gi, '\n')
                    .replace(/<\/div>/gi, '\n')
                    .replace(/<\/p>/gi, '\n\n')
                    .replace(/<div class="synthesized-header"[^>]*>/gi, '\n');

                const tmp = document.createElement("DIV");
                tmp.innerHTML = textWithNewlines;
                return (tmp.textContent || tmp.innerText || "")
                    .replace(/\n\s*\n/g, '\n\n')
                    .trim();
            };

            const joinedDef = Array.isArray(specificDefBlock) ? specificDefBlock.join('<hr/>') : specificDefBlock;

            const htmlContent = `<h2>${targetWord}</h2><div>${joinedDef}</div>`;
            const plainText = `${targetWord}\n\n${stripHtml(joinedDef)}`;

            const blobHtml = new Blob([htmlContent], { type: 'text/html' });
            const blobText = new Blob([plainText], { type: 'text/plain' });

            const data = [new ClipboardItem({
                'text/html': blobHtml,
                'text/plain': blobText,
            })];

            await navigator.clipboard.write(data);
            setToastMessage("Entry copied!");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        } catch (err) {
            console.error('Failed to copy: ', err);
            setToastMessage("Failed to copy");
            setShowToast(true);
            setTimeout(() => setShowToast(false), 2000);
        }
    };


    const startVerticalResizing = () => {
        isResizingVertical.current = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "row-resize";
    };

    const stopResizing = () => {
        isResizingVertical.current = false;
        isResizingSidebar.current = false;
        document.body.style.userSelect = "";
        document.body.style.cursor = "";
    };

    const startSidebarResizing = (e: React.MouseEvent) => {
        isResizingSidebar.current = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = "col-resize";
    };

    const saveSetting = (key: string, value: any) => {
        browser.storage.local.set({ [key]: value });
    };


    const renderTextWithClicks = (text: string) => {
        const tokens = text.split(/([^a-zA-Z\u0D80-\u0DFF]+)/).filter(Boolean);
        const elements: React.ReactNode[] = [];

        let i = 0;
        while (i < tokens.length) {
            const token = tokens[i];
            const isWord = /[a-zA-Z\u0D80-\u0DFF]/.test(token);
            const isSinhala = /[\u0D80-\u0DFF]/.test(token);
            const isEnglish = isWord && !isSinhala;

            if (isSinhala) {
                // Find extent of this Sinhala phrase
                let lastSinhalaIndex = i;
                for (let j = i + 1; j < tokens.length; j++) {
                    const nextToken = tokens[j];
                    if (/[a-zA-Z\u0D80-\u0DFF]/.test(nextToken)) {
                        if (/[\u0D80-\u0DFF]/.test(nextToken)) {
                            lastSinhalaIndex = j;
                        } else {
                            break; // found English word, end of phrase
                        }
                    }
                }

                // Process tokens from i to lastSinhalaIndex
                let phraseForTranslit = "";
                for (let k = i; k <= lastSinhalaIndex; k++) {
                    const t = tokens[k];
                    phraseForTranslit += t;
                    if (/[a-zA-Z\u0D80-\u0DFF]/.test(t)) {
                        elements.push(
                            <span key={k} className="clickable-word" onClick={(e) => { e.stopPropagation(); setQuery(t); handleSearch(t); }}>
                                {t}
                            </span>
                        );
                    } else {
                        elements.push(<span key={k}>{t}</span>);
                    }
                }

                if (transliterateDefinitions) {
                    elements.push(
                        <span key={`t-${i}`} className="seld-transliteration"> [{transliterateSinhala(phraseForTranslit.trim())}]</span>
                    );
                }

                i = lastSinhalaIndex + 1;
            } else if (isEnglish) {
                elements.push(
                    <span key={i} className="clickable-word" onClick={(e) => { e.stopPropagation(); setQuery(token); handleSearch(token); }}>
                        {token}
                    </span>
                );
                i++;
            } else {
                elements.push(<span key={i}>{token}</span>);
                i++;
            }
        }
        return elements;
    };

    const renderHtmlDefinition = (html: string) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        // Remove style and script tags to prevent leakage or execution
        const styles = doc.querySelectorAll('style, script');
        styles.forEach(s => s.remove());

        const convertNode = (node: Node, key: string): React.ReactNode => {
            if (node.nodeType === Node.TEXT_NODE) return <React.Fragment key={key}>{renderTextWithClicks(node.textContent || '')}</React.Fragment>;
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as HTMLElement;
                const tagName = element.tagName.toLowerCase();
                const children = Array.from(element.childNodes).map((child, i) => convertNode(child, `${key}-${i}`));

                // Final cleanup: remove color from style attribute if it exists
                if (element.style && element.style.color) {
                    element.style.color = '';
                }

                switch (tagName) {
                    case 'br': return <br key={key} />;
                    case 'hr': return <hr key={key} className={element.className} />;
                    case 'b': case 'strong': return <strong key={key} className={element.className}>{children}</strong>;
                    case 'i': case 'em': return <em key={key} className={element.className}>{children}</em>;
                    case 'u': return <u key={key} className={element.className}>{children}</u>;
                    case 'p': return <p key={key} className={element.className} style={{ color: 'inherit' }}>{children}</p>;
                    case 'div': return <div key={key} className={element.className} style={{ color: 'inherit' }}>{children}</div>;
                    case 'span': return <span key={key} className={element.className} style={{ color: 'inherit' }}>{children}</span>;
                    case 'ul': return <ul key={key} className={element.className}>{children}</ul>;
                    case 'li': return <li key={key} className={element.className} style={{ color: 'inherit' }}>{children}</li>;
                    case 'font': {
                        // User suggestion: strip colors clearly. Any specific mapping should be minimal.
                        // We will ignore the color attribute entirely.
                        return <span key={key} className={element.className} style={{ color: 'inherit' }}>{children}</span>;
                    }
                    default: return <React.Fragment key={key}>{children}</React.Fragment>;
                }
            }
            return null;
        };
        return Array.from(doc.body.childNodes).map((node, i) => convertNode(node, `node-${i}`));
    };

    return (
        <div id="seld-sidebar-inner" className={`seld-sidebar-container ${themeClass}`} style={{ '--font-size-percent': `${fontSize}%` } as any}>
            <div className="sidebar-resize-handle" onMouseDown={startSidebarResizing}></div>
            <div className="header-row">
                <div className="history-nav">
                    <button
                        className="history-btn"
                        onClick={goBack}
                        disabled={historyIndex.current <= 0}
                        title="Go back"
                    >&lt;</button>
                    <button
                        className="history-btn"
                        onClick={goForward}
                        disabled={historyIndex.current >= history.length - 1}
                        title="Go forward"
                    >&gt;</button>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="settings-btn" onClick={() => setView('search')}>Search</button>
                    <button className="settings-btn" onClick={() => setView('settings')}>Settings</button>
                    <button className="settings-btn" onClick={() => setView('info')}>Info</button>
                </div>
            </div>

            {view === 'search' && (
                <>
                    <div className="search-section">
                        <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); handleSearch(e.target.value); }} placeholder="Search..." className="search-input" />
                    </div>
                    <div className="content-area">
                        <div className="headword-list custom-scroll dynamic-font" style={{ height: `${listHeight}%`, flex: 'none' }}>
                            {results.length > 0 ? (
                                results.map((entry, idx) => (
                                    <div key={idx} ref={selectedWord === entry.word ? selectedRef : null} className={`headword-item ${selectedWord === entry.word ? 'selected' : ''}`} onClick={() => handleSelectWord(entry.word)}>
                                        {entry.word}
                                        {transliterateResults && /[\u0D80-\u0DFF]/.test(entry.word) && (
                                            <span className="seld-transliteration"> {transliterateSinhala(entry.word)}</span>
                                        )}
                                    </div>
                                ))
                            ) : (
                                query.trim() ? <div className="no-results">No results found</div> : null
                            )}
                        </div>
                        <div className="resize-divider" onMouseDown={startVerticalResizing}></div>
                        <div className="definition-area custom-scroll dynamic-font">
                            {definition ? (
                                <div className="definition-box">
                                    <h2 className="def-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                            <span>{selectedWord}</span>
                                            {transliterateHeadwords && /[\u0D80-\u0DFF]/.test(selectedWord || '') && (
                                                <span className="seld-transliteration" style={{ fontSize: '0.6em', fontWeight: 'normal', opacity: 0.8, marginTop: '2px' }}>{transliterateSinhala(selectedWord!)}</span>
                                            )}
                                        </div>
                                        <div className="global-actions" style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                className="copy-button"
                                                onClick={() => {
                                                    // Aggregate all definitions across blocks
                                                    let allDefs: string[] = [];
                                                    if (definition.length > 1) {
                                                        // Compound word: Include component headers in the copy text so the breakdown makes sense
                                                        allDefs = definition.map(b => {
                                                            const header = `<div style="font-weight: bold; font-size: 1.2em; margin-bottom: 8px; margin-top: 4px;">${b.headword}</div><br/>`;
                                                            const defs = b.homographDefinitions.join('<hr/>');
                                                            return `${header}${defs}`;
                                                        });
                                                    } else {
                                                        // Single word
                                                        allDefs = definition[0].homographDefinitions;
                                                    }
                                                    handleCopy(selectedWord!, allDefs);
                                                }}
                                                title="Copy full entry"
                                            >
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                                </svg>
                                            </button>
                                            <button
                                                className="tts-button"
                                                onClick={() => selectedWord && handleSpeak(selectedWord)}
                                                title="Speak word"
                                            >
                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                </svg>
                                            </button>
                                        </div>
                                    </h2>
                                    <div className="definition-content">
                                        {definition.map((block, bIdx) => (
                                            <div key={bIdx} className="synthesized-section" style={{ marginBottom: bIdx < definition.length - 1 ? '16px' : '0' }}>
                                                {/* Header for each component only if it's a compound structure */}
                                                {definition.length > 1 && (
                                                    <div className="synthesized-header">
                                                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                            <span
                                                                className="synthesized-header-text"
                                                                onClick={() => { setQuery(block.headword); handleSearch(block.headword); }}
                                                                title="Search this word"
                                                            >
                                                                {block.headword}
                                                            </span>
                                                            {transliterateHeadwords && /[\u0D80-\u0DFF]/.test(block.headword) && (
                                                                <span className="seld-transliteration" style={{ fontSize: '0.8em', fontWeight: 'normal', opacity: 0.8, marginTop: '2px' }}>{transliterateSinhala(block.headword)}</span>
                                                            )}
                                                        </div>
                                                        <div style={{ display: 'flex', gap: '8px', opacity: 0.8, transform: 'scale(0.85)' }}>
                                                            <button
                                                                className="copy-button"
                                                                onClick={() => handleCopy(block.headword, block.homographDefinitions)}
                                                                title="Copy entry"
                                                            >
                                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                                                    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                                                </svg>
                                                            </button>
                                                            <button
                                                                className="tts-button"
                                                                onClick={() => handleSpeak(block.headword)}
                                                                title="Speak word"
                                                            >
                                                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                                                                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                                                                </svg>
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Homograph definitions */}
                                                {block.homographDefinitions.map((homograph, hIdx) => (
                                                    <div key={hIdx}>
                                                        {renderHtmlDefinition(homograph)}
                                                        {hIdx < block.homographDefinitions.length - 1 && <hr className="homograph-separator" style={{ margin: '8px 0' }} />}
                                                    </div>
                                                ))}

                                                {bIdx < definition.length - 1 && <hr style={{ margin: '16px 0', border: 'none', borderTop: '2px dashed var(--border-color)' }} />}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                !query ? <div className="empty-state">Highlight text or double click to look up</div> : (
                                    results.length > 0 ? <div className="empty-state">Select a word</div> : null
                                )
                            )}
                        </div>
                    </div>
                </>
            )}

            {view === 'settings' && (
                <div className="settings-panel glassmorphism custom-scroll">
                    <div className="settings-group">
                        <label className="settings-label">Appearance</label>
                        <div className="settings-control">
                            {(['system', 'light', 'dark'] as Theme[]).map(t => (
                                <button key={t} className={`toggle-btn ${theme === t ? 'active' : ''}`} onClick={() => { setTheme(t); saveSetting('theme', t); }}>{t.toUpperCase()}</button>
                            ))}
                        </div>
                    </div>
                    <div className="settings-group">
                        <label className="settings-label">Font Size</label>
                        <div className="slider-container">
                            <input
                                type="range"
                                min="40"
                                max="250"
                                value={fontSize}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setFontSize(val);
                                    saveSetting('fontSize', val);
                                }}
                            />
                            <span className="slider-value">{fontSize}%</span>
                        </div>
                        <div className="dynamic-font" style={{ marginTop: '0.4em', color: 'var(--text-primary)', textAlign: 'center' }}>
                            ෴ශබ්දකෝෂය෴
                        </div>
                    </div>
                    <div className="settings-group">
                        <label className="settings-label">Behavior</label>
                        <div className="settings-control">
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={ctrlClickLookup}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setCtrlClickLookup(val);
                                        saveSetting('seldCtrlClickLookup', val);
                                    }}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="checkbox-label">Ctrl + click to look up</span>
                            </label>

                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={underlineDictionaryWords}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setUnderlineDictionaryWords(val);
                                        saveSetting('seldUnderlineWords', val);
                                    }}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="checkbox-label">Underline words in dictionary</span>
                            </label>

                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={autoPlayTTS}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setAutoPlayTTS(val);
                                        autoPlayTTSRef.current = val;
                                        saveSetting('seldAutoPlayTTS', val);
                                    }}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="checkbox-label">Auto-play TTS for matched words</span>
                            </label>

                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={overrideSinhalaFont}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setOverrideSinhalaFont(val);
                                        saveSetting('seldOverrideSinhalaFont', val);
                                    }}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="checkbox-label">Override page Sinhala font</span>
                            </label>
                        </div>
                    </div>

                    <div className="settings-group">
                        <label className="settings-label">Transliteration</label>
                        <div className="settings-control">
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={transliterateHeadwords}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setTransliterateHeadwords(val);
                                        saveSetting('seldTransliterateHeadwords', val);
                                    }}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="checkbox-label">Transliterate headwords</span>
                            </label>

                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={transliterateResults}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setTransliterateResults(val);
                                        saveSetting('seldTransliterateResults', val);
                                    }}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="checkbox-label">Transliterate results list</span>
                            </label>

                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={transliterateDefinitions}
                                    onChange={(e) => {
                                        const val = e.target.checked;
                                        setTransliterateDefinitions(val);
                                        saveSetting('seldTransliterateDefinitions', val);
                                    }}
                                />
                                <span className="custom-checkbox"></span>
                                <span className="checkbox-label">Transliterate definitions inline</span>
                            </label>
                        </div>
                    </div>
                </div>
            )}

            {view === 'info' && (
                <div className="info-pane glassmorphism custom-scroll">
                    <h3>About SELD Dictionary</h3>
                    <p>Sinhala-English Learner's Dictionary (SELD).</p>
                    <p>Double click or select words to look up.</p>
                    <p>Text to speech provided by Google.</p>
                    <details>
                        <summary>Pages to try</summary>
                        <p>The following pages have good coverage in the SELD</p>
                        <ul className='test-sites'>
                            <li><a rel='noreferrer' target='_blank' href='https://mahamegha.lk/2022/04/23/sirapa-wandanawa/'>සිරිපා වන්දනාවේ ගිය ගැමි කවියෝ</a></li>
                            <li><a rel='noreferrer' target='_blank' href='https://tripitaka.online/sutta/7478'>අංගුත්තර නිකාය තික නිපාතෝ 3.1.1.1. </a></li>
                        </ul>

                    </details>
                </div>
            )}
            {showToast && <div className="toast-notification">{toastMessage}</div>}
        </div>
    );
}

export default App;
