import React, { useState, useEffect, useRef } from 'react';
import { stardict, IndexEntry } from '../../utils/stardict';

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
    const [lookupEnabled, setLookupEnabled] = useState(true);
    const [listHeight, setListHeight] = useState(35); // percentage

    const selectedRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);

    const isInitialized = useRef(false);

    // Dictionary Highlight Logic
    useEffect(() => {
        // Only run when view is 'search' and we know lookup is enabled
        let isActive = true;

        const handleHighlights = async () => {
            try {
                const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tabs.length === 0 || !tabs[0].id) {
                    return;
                }
                const tabId = tabs[0].id;

                // Fire off REQUEST_WORDS message
                const response = await new Promise<any>((resolve) => {
                    chrome.tabs.sendMessage(tabId, { action: 'REQUEST_WORDS' }, (res) => {
                        if (chrome.runtime.lastError) {
                            resolve(null);
                        } else {
                            resolve(res);
                        }
                    });
                });

                if (!isActive) return;
                if (!response || !response.words) {
                    return;
                }

                // Find exact matches
                const uniqueWords = response.words as string[];
                const exactMatches = await stardict.findExistingWords(uniqueWords);

                if (!isActive || exactMatches.length === 0) return;

                // Send matches back to content script
                chrome.tabs.sendMessage(tabId, { action: 'APPLY_HIGHLIGHTS', words: exactMatches }, (res) => {
                    if (chrome.runtime.lastError) {
                        console.warn("Could not apply highlights:", chrome.runtime.lastError);
                    }
                });

            } catch (e) {
                console.error("Highlighting error in App.tsx:", e);
            }
        };

        if (view === 'search' && lookupEnabled) {
            handleHighlights();
        }

        // Listen for tab updates (URL changes in SPA)
        const onTabUpdated = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
            if ((changeInfo.status === 'complete' || changeInfo.url) && tab.active) {
                handleHighlights();
            }
        };
        chrome.tabs.onUpdated.addListener(onTabUpdated);

        return () => {
            isActive = false;
            chrome.tabs.onUpdated.removeListener(onTabUpdated);
            // Clear highlights when sidepanel unmounts or changes view
            chrome.tabs.query({ active: true, currentWindow: true }).then((tabs) => {
                if (tabs.length > 0 && tabs[0].id) {
                    chrome.tabs.sendMessage(tabs[0].id, { action: 'CLEAR_HIGHLIGHTS' }, () => {
                        const _ = chrome.runtime.lastError; // Ignore error if content script is gone
                    });
                }
            });
        };
    }, [view, lookupEnabled]);

    useEffect(() => {
        // Load settings
        chrome.storage.local.get(['theme', 'fontSize', 'seldLookupEnabled', 'listHeight'], (res) => {
            if (res.theme) setTheme(res.theme);
            if (res.fontSize) setFontSize(res.fontSize);
            if (res.seldLookupEnabled !== undefined) setLookupEnabled(res.seldLookupEnabled);
            if (res.listHeight) setListHeight(res.listHeight);
        });

        // Load session state and check for a new query
        chrome.storage.local.get(['seldSearchQuery'], (localRes) => {
            const newQueryFromClick = localRes.seldSearchQuery;

            chrome.storage.session.get(['view', 'query', 'selectedWord'], async (sessionRes) => {
                let currentQuery = newQueryFromClick || sessionRes.query || '';
                let currentSelected = newQueryFromClick ? null : (sessionRes.selectedWord || null);

                if (sessionRes.view && !newQueryFromClick) setView(sessionRes.view as View);
                else if (newQueryFromClick) setView('search');

                if (currentQuery) {
                    setQuery(currentQuery);
                    const matches = await stardict.searchWords(currentQuery, 30);
                    setResults(matches);
                    if (currentSelected) {
                        setSelectedWord(currentSelected);
                        const def = await stardict.getDefinition(currentSelected);
                        setDefinition(def);
                    } else if (matches.length > 0) {
                        const exact = matches.find(m => m.word === currentQuery);
                        if (exact) {
                            setSelectedWord(exact.word);
                            const def = await stardict.getDefinition(exact.word);
                            setDefinition(def);
                        } else {
                            setSelectedWord(null);
                            setDefinition(null);
                        }
                    }
                }
                isInitialized.current = true;

                // Consume the local storage query so it doesn't reopen next time
                if (newQueryFromClick) {
                    chrome.storage.local.remove('seldSearchQuery');
                }
            });
        });

        const handleStorageChange = (changes: any, namespace: string) => {
            if (namespace === 'local' && changes.seldSearchQuery && changes.seldSearchQuery.newValue) {
                const newQuery = changes.seldSearchQuery.newValue;
                setQuery(newQuery);
                handleSearch(newQuery);
                setView('search');
                chrome.storage.local.remove('seldSearchQuery');
            }
        };
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

    useEffect(() => {
        if (isInitialized.current) {
            chrome.storage.session.set({ view, query, selectedWord });
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
            document.body.className = currentClass;
            document.documentElement.className = currentClass;
        };
        updateTheme();

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaQuery.addEventListener('change', updateTheme);
        return () => mediaQuery.removeEventListener('change', updateTheme);
    }, [theme]);

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
        const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=si&client=tw-ob`;
        const audio = new Audio(url);
        audio.play().catch(e => console.error("TTS Playback error:", e));
    };

    const startResizing = () => { isResizing.current = true; };
    const stopResizing = () => { isResizing.current = false; };
    const resize = (e: React.MouseEvent) => {
        if (!isResizing.current) return;
        const containerHeight = window.innerHeight;
        const newHeight = (e.clientY / containerHeight) * 100;
        if (newHeight > 10 && newHeight < 80) {
            setListHeight(newHeight);
            chrome.storage.local.set({ listHeight: newHeight });
        }
    };

    const saveSetting = (key: string, value: any) => {
        chrome.storage.local.set({ [key]: value });
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
        const convertNode = (node: Node, key: string): React.ReactNode => {
            if (node.nodeType === Node.TEXT_NODE) return <React.Fragment key={key}>{renderTextWithClicks(node.textContent || '')}</React.Fragment>;
            if (node.nodeType === Node.ELEMENT_NODE) {
                const element = node as Element;
                const tagName = element.tagName.toLowerCase();
                const children = Array.from(element.childNodes).map((child, i) => convertNode(child, `${key}-${i}`));
                switch (tagName) {
                    case 'br': return <br key={key} />;
                    case 'hr': return <hr key={key} className={element.className} />;
                    case 'b': case 'strong': return <strong key={key} className={element.className}>{children}</strong>;
                    case 'i': case 'em': return <em key={key} className={element.className}>{children}</em>;
                    case 'u': return <u key={key} className={element.className}>{children}</u>;
                    case 'p': return <p key={key} className={element.className}>{children}</p>;
                    case 'div': return <div key={key} className={element.className}>{children}</div>;
                    case 'span': return <span key={key} className={element.className}>{children}</span>;
                    case 'ul': return <ul key={key} className={element.className}>{children}</ul>;
                    case 'li': return <li key={key} className={element.className}>{children}</li>;
                    case 'font': {
                        let color = element.getAttribute('color') || '';
                        let styleColor = color;
                        if (themeClass === 'dark-theme') {
                            const lower = color.toLowerCase();
                            if (lower === 'black' || lower === '#000000' || lower === '#000' || lower === '#333333' || lower === '#1f2328') {
                                styleColor = 'var(--text-primary)';
                            } else if (lower === 'blue' || lower === '#0000ff' || lower === '#191970' || lower === '#000080') {
                                styleColor = 'var(--accent)';
                            } else if (lower === 'darkgreen' || lower === 'green' || lower === '#008000') {
                                styleColor = '#4ade80';
                            } else if (lower === 'red' || lower === '#ff0000') {
                                styleColor = '#f87171';
                            }
                        }
                        return <span key={key} className={element.className} style={styleColor ? { color: styleColor } : {}}>{children}</span>;
                    }
                    default: return <React.Fragment key={key}>{children}</React.Fragment>;
                }
            }
            return null;
        };
        return Array.from(doc.body.childNodes).map((node, i) => convertNode(node, `node-${i}`));
    };

    return (
        <div className={`container ${themeClass}`} style={{ '--font-size-percent': `${fontSize}%` } as any} onMouseMove={resize} onMouseUp={stopResizing}>
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
                        <div className="headword-list custom-scroll" style={{ height: `${listHeight}%`, flex: 'none' }}>
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
                        <div className="resize-divider" onMouseDown={startResizing}></div>
                        <div className="definition-area custom-scroll">
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
                    </div>
                    <div className="settings-group">
                        <label className="settings-label">Behavior</label>
                        <div className="settings-control">
                            <button className={`toggle-btn ${lookupEnabled ? 'active' : ''}`} onClick={() => { setLookupEnabled(!lookupEnabled); saveSetting('seldLookupEnabled', !lookupEnabled); }}>
                                Double-Click Lookup: {lookupEnabled ? 'ON' : 'OFF'}
                            </button>
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
