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

    useEffect(() => {
        // Load settings
        chrome.storage.local.get(['theme', 'fontSize', 'seldLookupEnabled', 'listHeight'], (res) => {
            if (res.theme) setTheme(res.theme);
            if (res.fontSize) setFontSize(res.fontSize);
            if (res.seldLookupEnabled !== undefined) setLookupEnabled(res.seldLookupEnabled);
            if (res.listHeight) setListHeight(res.listHeight);
        });

        const handleStorageChange = (changes: any, namespace: string) => {
            if (namespace === 'local' && changes.seldSearchQuery) {
                setQuery(changes.seldSearchQuery.newValue);
                handleSearch(changes.seldSearchQuery.newValue);
                setView('search');
            }
        };
        chrome.storage.onChanged.addListener(handleStorageChange);
        return () => chrome.storage.onChanged.removeListener(handleStorageChange);
    }, []);

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
        if (exact) handleSelectWord(exact.word);
    };

    const handleSelectWord = async (word: string) => {
        setSelectedWord(word);
        const def = await stardict.getDefinition(word);
        setDefinition(def);
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
                    case 'b': case 'strong': return <strong key={key}>{children}</strong>;
                    case 'i': case 'em': return <em key={key}>{children}</em>;
                    case 'u': return <u key={key}>{children}</u>;
                    case 'p': return <p key={key}>{children}</p>;
                    case 'div': return <div key={key}>{children}</div>;
                    case 'span': return <span key={key}>{children}</span>;
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
                        return <span key={key} style={styleColor ? { color: styleColor } : {}}>{children}</span>;
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
                <h3>SELD Dictionary</h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="settings-btn" onClick={() => setView('search')}>Search</button>
                    <button className="settings-btn" onClick={() => setView('settings')}>Settings</button>
                    <button className="settings-btn" onClick={() => setView('info')}>Info</button>
                </div>
            </div>

            {view === 'search' && (
                <>
                    <div className="search-section glassmorphism">
                        <input type="text" value={query} onChange={(e) => { setQuery(e.target.value); handleSearch(e.target.value); }} placeholder="Search..." className="search-input" />
                    </div>
                    <div className="content-area">
                        <div className="headword-list custom-scroll" style={{ height: `${listHeight}%`, flex: 'none' }}>
                            {results.map((entry, idx) => (
                                <div key={idx} ref={selectedWord === entry.word ? selectedRef : null} className={`headword-item ${selectedWord === entry.word ? 'selected' : ''}`} onClick={() => handleSelectWord(entry.word)}>
                                    {entry.word}
                                </div>
                            ))}
                        </div>
                        <div className="resize-divider" onMouseDown={startResizing}></div>
                        <div className="definition-area custom-scroll">
                            {definition ? (
                                <div className="definition-box">
                                    <h2 className="def-title">{selectedWord}</h2>
                                    <div className="definition-content">{renderHtmlDefinition(definition)}</div>
                                </div>
                            ) : <div className="empty-state">{query ? 'Select a word' : 'Highlight text on a page to look up'}</div>}
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
