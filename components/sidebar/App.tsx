import React, { useState, useEffect, useRef } from 'react';
import { stardict, IndexEntry } from '../../utils/stardict';
import { extractUniqueSinhalaWords, applyHighlights } from '../../utils/dom-highlights';
import { browser } from 'wxt/browser';

type View = 'search' | 'settings' | 'info';
type Theme = 'light' | 'dark' | 'system';

function App() {
    const [view, setView] = useState<View>('search');
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<IndexEntry[]>([]);
    const [selectedWord, setSelectedWord] = useState<string | null>(null);
    const [definition, setDefinition] = useState<string | null>(null);

    // Settings state
    const [theme, setTheme] = useState<Theme>('system');
    const [fontSize, setFontSize] = useState(100);
    const [ctrlClickLookup, setCtrlClickLookup] = useState(true);
    const [underlineDictionaryWords, setUnderlineDictionaryWords] = useState(true);
    const [listHeight, setListHeight] = useState(35); // percentage
    const [sidebarWidth, setSidebarWidth] = useState(350);
    const selectedRef = useRef<HTMLDivElement>(null);
    const isResizingVertical = useRef(false);
    const isResizingSidebar = useRef(false);

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
        browser.storage.local.get(['theme', 'fontSize', 'seldCtrlClickLookup', 'seldUnderlineWords', 'listHeight', 'seldSearchQuery', 'sidebarWidth']).then((res) => {
            if (res.theme) setTheme(res.theme as Theme);
            if (res.fontSize) setFontSize(res.fontSize as number);
            if (res.seldCtrlClickLookup !== undefined) setCtrlClickLookup(res.seldCtrlClickLookup as boolean);
            if (res.seldUnderlineWords !== undefined) setUnderlineDictionaryWords(res.seldUnderlineWords as boolean);
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


    const handleSearch = async (q: string) => {
        if (!q.trim()) {
            setResults([]);
            setDefinition(null);
            setSelectedWord(null);
            return;
        }
        const matches = await stardict.searchWords(q, 30);
        setResults(matches);
        const exact = matches.find(m => m.word === q);
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
        const tokens = text.split(/([^a-zA-Z\u0D80-\u0DFF]+)/);
        return tokens.map((token, i) => {
            if (!/[a-zA-Z\u0D80-\u0DFF]/.test(token)) return <span key={i}>{token}</span>;
            return (
                <span key={i} className="clickable-word" onClick={(e) => { e.stopPropagation(); setQuery(token); handleSearch(token); }}>
                    {token}
                </span>
            );
        });
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
                                    <h2 className="def-title">
                                        {selectedWord}
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
                                    </h2>
                                    <div className="definition-content">{renderHtmlDefinition(definition)}</div>
                                </div>
                            ) : (
                                !query ? <div className="empty-state">Highlight text on a page to look up</div> : (
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
                            ශබ්දකෝෂය
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
                        </div>
                    </div>
                </div>
            )}

            {view === 'info' && (
                <div className="info-pane glassmorphism custom-scroll">
                    <h3>About SELD Dictionary</h3>
                    <p>Sinhala-English Language Dictionary (SELD) Browser Extension.</p>
                    <p>Features:</p>
                    <ul>
                        <li>StarDict local parsing</li>
                        <li>Double-click lookups</li>
                        <li>Interactive definitions</li>
                        <li>Customizable themes & text size</li>
                    </ul>
                    <p>Version 2.0.0</p>
                </div>
            )}
        </div>
    );
}

export default App;
