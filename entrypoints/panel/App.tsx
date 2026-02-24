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

    const [theme, setTheme] = useState<Theme>('system');
    const [fontSize, setFontSize] = useState(100);
    const [ctrlClickLookup, setCtrlClickLookup] = useState(true);
    const [underlineDictionaryWords, setUnderlineDictionaryWords] = useState(true);
    const [listHeight, setListHeight] = useState(35);

    const selectedRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);

    const isInitialized = useRef(false);

    const sendMessageToParent = (action: string, data?: any) => {
        window.parent.postMessage({ action, ...data }, '*');
    };

    useEffect(() => {
        const handleMessage = (event: MessageEvent) => {
            if (!event.data || typeof event.data !== 'object') return;
            const { action, ...data } = event.data;
            
            switch (action) {
                case 'SETTINGS_RESPONSE':
                    if (data.theme) setTheme(data.theme as Theme);
                    if (data.fontSize) setFontSize(data.fontSize as number);
                    if (data.seldCtrlClickLookup !== undefined) setCtrlClickLookup(data.seldCtrlClickLookup as boolean);
                    if (data.seldUnderlineWords !== undefined) setUnderlineDictionaryWords(data.seldUnderlineWords as boolean);
                    if (data.listHeight) setListHeight(data.listHeight as number);
                    break;
                case 'SEARCH_QUERY':
                    if (data.query) {
                        setQuery(data.query);
                        handleSearch(data.query);
                        setView('search');
                    }
                    break;
            }
        };
        window.addEventListener('message', handleMessage);
        sendMessageToParent('GET_SETTINGS');
        return () => window.removeEventListener('message', handleMessage);
    }, []);

    useEffect(() => {
        sendMessageToParent('SIDEPANEL_OPEN');
        return () => {
            sendMessageToParent('SIDEPANEL_CLOSE');
        };
    }, []);

    useEffect(() => {
        sendMessageToParent('REQUEST_HIGHLIGHTS', { underlineEnabled: underlineDictionaryWords });
    }, [underlineDictionaryWords]);

    useEffect(() => {
        if (isInitialized.current) {
            sendMessageToParent('SAVE_SESSION', { view, query, selectedWord });
        }
    }, [view, query, selectedWord]);

    useEffect(() => {
        if (selectedRef.current) {
            selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, [selectedWord]);

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

    useEffect(() => {
        isInitialized.current = true;
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
            sendMessageToParent('SAVE_SETTING', { key: 'listHeight', value: newHeight });
        }
    };

    const saveSetting = (key: string, value: any) => {
        sendMessageToParent('SAVE_SETTING', { key, value });
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
                        <div className="resize-divider" onMouseDown={startResizing}></div>
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
