import React, { useState, useEffect, useRef } from "react";
import { stardict, IndexEntry, StructuredDefinition } from "../../utils/stardict";
import { DEFAULT_SEARCH_LIMIT, DEFAULT_SEARCH_DEBOUNCE_MS } from "../../utils/constants";
import { extractUniqueSinhalaWords, applyHighlights } from "../../utils/dom-highlights";
import { transliterateSinhala as transliterateSinhalaTxt } from "../../utils/transliterate";
import { browser } from "wxt/browser";
import { DefinitionCard } from "../shared/DefinitionCard";
import { CarterFallbackLink } from "../shared/CarterFallbackLink";


import { SettingsUI } from "../shared/SettingsUI";
import { Theme } from "../shared/types";
import { Highlighter } from "../shared/Highlighter";
import { HistoryNav } from "../shared/HistoryNav";
import { InfoUI } from "../shared/InfoUI";
import { useGlobalTooltips } from "../shared/useGlobalTooltips";

type View = "search" | "settings" | "info";

const HEADER_BREAK_WIDTH = 450;

interface AppProps {
  onClose?: () => void;
  inline?: boolean;
}

function App({ onClose, inline }: AppProps) {
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IndexEntry[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [selectedOriginalQuery, setSelectedOriginalQuery] = useState<string | null>(null);
  const [definition, setDefinition] = useState<StructuredDefinition[] | null>(null);
  const [searchBooster, setSearchBooster] = useState<string | null>(null);

  // Settings state
  const [theme, setTheme] = useState<Theme>("system");
  const [fontSize, setFontSize] = useState(100);
  const [ctrlClickLookup, setCtrlClickLookup] = useState(true);
  const [underlineDictionaryWords, setUnderlineDictionaryWords] = useState(true);
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);
  const [overrideSinhalaFont, setOverrideSinhalaFont] = useState(false);

  // Transliteration settings
  const [transliterateSinhala, setTransliterateSinhala] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('right');
  const [sitePatches, setSitePatches] = useState(false);

  const autoPlayTTSRef = useRef(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [listHeight, setListHeight] = useState(25); // percentage
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const selectedRef = useRef<HTMLDivElement>(null);
  const isResizingVertical = useRef(false);
  const isResizingSidebar = useRef(false);

  // History navigation state
  const [history, setHistory] = useState<string[]>([]);
  const historyIndex = useRef(-1);
  const isNavigatingHistory = useRef(false);

  // Favorites state
  const [favorites, setFavorites] = useState<string[]>([]);


  const listRef = useRef<HTMLDivElement>(null);
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

  const appRef = useRef<HTMLDivElement>(null);
  useGlobalTooltips(appRef);

  // Apply font override if enabled and sidebar is being opened

  // Dictionary Highlight Logic
  useEffect(() => {
    let isActive = true;
    const handleHighlights = async () => {
      try {
        const uniqueWords = extractUniqueSinhalaWords();
        if (!isActive) return;

        const exactMatches = await stardict.findExistingWords(uniqueWords);
        if (!isActive) return;

        applyHighlights(exactMatches, underlineDictionaryWords);
      } catch (e) {
        console.error("Highlighting error in App.tsx:", e);
      }
    };

    handleHighlights();

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
    const settingsConfig: Record<string, (val: any) => void> = {
      theme: v => setTheme(v as Theme),
      fontSize: v => setFontSize(v as number),
      seldCtrlClickLookup: v => setCtrlClickLookup(v as boolean),
      seldUnderlineWords: v => setUnderlineDictionaryWords(v as boolean),
      seldAutoPlayTTS: v => {
        setAutoPlayTTS(v as boolean);
        autoPlayTTSRef.current = v as boolean;
      },
      seldOverrideSinhalaFont: v => setOverrideSinhalaFont(v as boolean),
      sidebarWidth: v => setSidebarWidth(v as number),
      listHeight: v => setListHeight(v as number),
      transliterateSinhala: v => setTransliterateSinhala(v as boolean),
      seldSidebarPosition: v => setSidebarPosition(v as 'left' | 'right'),
      seldSitePatches: v => setSitePatches(v as boolean),
      seldSearchHistory: v => {
        if (Array.isArray(v)) {
          setHistory(v);
          historyIndex.current = v.length - 1;
        }
      },
      seldFavorites: v => {
        if (Array.isArray(v)) {
          setFavorites(v);
        }
      },
    };

    const keys = Object.keys(settingsConfig);

    // Initial load
    browser.storage.local.get(keys).then(res => {
      Object.entries(res).forEach(([key, value]) => {
        if (value !== undefined && settingsConfig[key]) {
          settingsConfig[key](value);
        }
      });
      isInitialized.current = true;
    });

    // Listen for changes from other tabs
    const handleStorageChange = (changes: Record<string, any>, namespace: string) => {
      if (namespace === "local") {
        Object.entries(changes).forEach(([key, change]) => {
          if (settingsConfig[key] && change.newValue !== undefined) {
            settingsConfig[key](change.newValue);
          }
        });
      }
    };

    const handleSearchEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        if (typeof detail === 'object' && detail.primarySearch) {
          setQuery(detail.fallbackSearch);
          setSearchBooster(detail.primarySearch);
          handleSearch(detail.fallbackSearch, detail.primarySearch);
        } else {
          setQuery(detail as string);
          setSearchBooster(null);
          handleSearch(detail as string);
        }
        setView("search");
      }
    };

    browser.storage.onChanged.addListener(handleStorageChange);
    window.addEventListener("seld:search", handleSearchEvent);

    return () => {
      browser.storage.onChanged.removeListener(handleStorageChange);
      window.removeEventListener("seld:search", handleSearchEvent);
    };
  }, []);

  useEffect(() => {
    // Only persist non-transient settings if needed.
    // View, query, and selectedWord should NOT be persisted globally as they are tab-local.
  }, [view, query, selectedWord]);

  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [selectedWord]);

  // Scroll list to top when results change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = 0;
    }
  }, [results]);

  // Apply theme class to container
  const getThemeClass = () => {
    if (theme === "system") {
      return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark-theme" : "light-theme";
    }
    return theme === "dark" ? "dark-theme" : "light-theme";
  };

  const themeClass = getThemeClass();

  useEffect(() => {
    const updateTheme = () => {
      const currentClass = getThemeClass();
      // Don't set document.body className - it leaks to the host page
      // Instead, we rely on the theme class on our own container
    };
    updateTheme();

    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", updateTheme);
    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, [theme]);

  useEffect(() => {
    // Update the CSS variable for the sidebar width
    document.documentElement.style.setProperty("--seld-panel-width", `${sidebarWidth}px`);
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
        const width = sidebarPosition === 'right' ? window.innerWidth - e.clientX : e.clientX;
        if (width > 320 && width < window.innerWidth * 0.8) {
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

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, [sidebarPosition]); // Added dependency to use correct width calculation

  const sanitizeSearchQuery = (q: string) => {
    // Sanitize leading and trailing whitespace and punctuation: . , ; : ' " ‘ ’ “ ” - – —
    // Using Unicode codepoints for robustness as requested
    return q.replace(/^[\u002E\u002C\u003B\u003A\u0027\u0022\u2018\u2019\u201C\u201D\u002D\u2013\u2014\s]+|[\u002E\u002C\u003B\u003A\u0027\u0022\u2018\u2019\u201C\u201D\u002D\u2013\u2014\s]+$/g, "");
  };

  useEffect(() => {
    if (view !== "search") return;

    const timer = setTimeout(() => {
      handleSearch(query, searchBooster);
    }, DEFAULT_SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query, view]);

  // Debounced history push for all searched queries (not just dictionary matches)
  useEffect(() => {
    if (view !== "search") return;
    const sanitized = sanitizeSearchQuery(query);
    if (!sanitized) return;

    const timer = setTimeout(() => {
      if (isNavigatingHistory.current) return;
      setHistory(prev => {
        const truncated = prev.slice(0, historyIndex.current + 1);
        if (truncated.length > 0 && truncated[truncated.length - 1] === sanitized) {
          return truncated;
        }
        const updated = [...truncated, sanitized];
        historyIndex.current = updated.length - 1;
        browser.storage.local.set({ seldSearchHistory: updated });
        return updated;
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [query, view]);

  const handleSearch = async (q: string, booster?: string | null) => {
    const sanitized = sanitizeSearchQuery(q);
    if (!sanitized) {
      setResults([]);
      setDefinition(null);
      setSelectedWord(null);
      setSelectedOriginalQuery(null);
      return;
    }

    let boosterMatches: IndexEntry[] = [];
    let boosterExact: IndexEntry | undefined;

    if (booster) {
      const bSanitized = sanitizeSearchQuery(booster);
      const matches = await stardict.searchWords(bSanitized, 5);
      boosterExact = matches.find(m => m.word.toLowerCase() === bSanitized.toLowerCase()) || matches.find(m => m.isSynthesizedMatch);
      if (boosterExact) {
        boosterMatches = matches;
      }
    }

    const fallbackMatches = await stardict.searchWords(sanitized, DEFAULT_SEARCH_LIMIT);

    if (boosterExact) {
      const merged = [...boosterMatches];
      const seen = new Set(merged.map(m => m.word));
      for (const fm of fallbackMatches) {
        if (!seen.has(fm.word)) {
          merged.push(fm);
        }
      }
      setResults(merged);
      handleSelectWord(boosterExact.word, boosterExact.originalQuery);
    } else {
      const exact = fallbackMatches.find(m => m.word.toLowerCase() === sanitized.toLowerCase()) || fallbackMatches.find(m => m.isSynthesizedMatch);
      setResults(fallbackMatches);
      if (exact) {
        handleSelectWord(exact.word, exact.originalQuery);
      } else {
        setDefinition(null);
        setSelectedWord(null);
        setSelectedOriginalQuery(null);
      }
    }
  };

  const handleSelectWord = async (word: string, originalQuery?: string) => {
    setSelectedWord(word);
    setSelectedOriginalQuery(originalQuery || null);
    const def = await stardict.getDefinition(word);
    setDefinition(def);
    if (autoPlayTTSRef.current) handleSpeak(originalQuery || word);

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
        browser.storage.local.set({ seldSearchHistory: updated });
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
    const sanitized = sanitizeSearchQuery(word);
    const matches = await stardict.searchWords(sanitized, 30);
    const entry = matches.find(m => m.word === word) || matches.find(m => m.word === sanitized);
    await handleSearch(word);
    await handleSelectWord(word, entry?.originalQuery);
    isNavigatingHistory.current = false;
    setView("search");
  };


  const goForward = async () => {
    if (historyIndex.current >= history.length - 1) return;
    historyIndex.current += 1;
    const word = history[historyIndex.current];
    isNavigatingHistory.current = true;
    setQuery(word);
    const sanitized = sanitizeSearchQuery(word);
    const matches = await stardict.searchWords(sanitized, 30);
    const entry = matches.find(m => m.word === word) || matches.find(m => m.word === sanitized);
    await handleSearch(word);
    await handleSelectWord(word, entry?.originalQuery);
    isNavigatingHistory.current = false;
    setView("search");
  };

  const handleSpeak = (text: string) => {
    if (!text) return;

    browser.runtime
      .sendMessage({ action: "GET_TTS_AUDIO", text, tl: "si" })
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

  const handleCopy = async ({ copyText, typeName }: { copyText: string; typeName: string }) => {
    try {
      await navigator.clipboard.writeText(copyText);
      setToastMessage(`Copied: ${typeName}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      setToastMessage("Failed to copy");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    }
  };

  const handleExplorerClick = (word: string) => {
    browser.runtime.sendMessage({ action: 'OPEN_EXPLORER', word });
  };

  const startVerticalResizing = () => {
    isResizingVertical.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "row-resize";
  };

  const startSidebarResizing = (e: React.MouseEvent) => {
    isResizingSidebar.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const saveSetting = (key: string, value: any) => {
    browser.storage.local.set({ [key]: value });
  };

  // History dropdown helpers
  const clearHistory = () => {
    setHistory([]);
    historyIndex.current = -1;
    browser.storage.local.set({ seldSearchHistory: [] });
  };

  const downloadHistory = () => {
    const unique = [...new Set(history)];
    const blob = new Blob([unique.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "seld-history.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleHistoryWordClick = (word: string) => {
    setQuery(word);
    handleSearch(word);
    setView("search");
  };

  const handleToggleFavorite = (word: string) => {
    setFavorites(prev => {
      let newFavs: string[];
      if (prev.includes(word)) {
        newFavs = prev.filter(w => w !== word);
      } else {
        newFavs = [...prev, word];
      }
      browser.storage.local.set({ seldFavorites: newFavs });
      return newFavs;
    });
  };

  return (
    <div
      id="seld-sidebar-inner"
      ref={appRef}
      className={`seld-sidebar-container seld-theme-vars ${themeClass} ${sidebarPosition === 'left' ? 'left-position' : ''}`}
      style={{
        "--font-size-percent": `${fontSize}%`,
        position: inline ? 'relative' : 'fixed',
        top: inline ? 'auto' : 0,
        [sidebarPosition]: inline ? 'auto' : 0,
        [sidebarPosition === 'right' ? 'left' : 'right']: 'auto',
        width: `${sidebarWidth}px`,
        height: inline ? '100%' : '100vh',
        zIndex: inline ? 1 : 2147483647
      } as any}
    >
      <div className="sidebar-resize-handle" onMouseDown={startSidebarResizing}></div>
      <div className="header-row">
        <HistoryNav
          history={history}
          historyIndex={historyIndex}
          transliterateSinhala={transliterateSinhala}
          onGoBack={goBack}
          onGoForward={goForward}
          onWordClick={handleHistoryWordClick}
          onClear={clearHistory}
          onDownload={downloadHistory}
        />
        {!isResizingSidebar.current && sidebarWidth < 300 ? "" : "SELD"}
        <div className="sidebar-header-actions">
          <button className={`seld-btn seld-tab-folder ${sidebarWidth < HEADER_BREAK_WIDTH ? "seld-btn-icon-circle" : ""} ${view === "search" ? "active" : ""}`} onClick={() => setView("search")} data-tippy-content="Search">
            {sidebarWidth < HEADER_BREAK_WIDTH ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            ) : (
              "Search"
            )}
          </button>
          <button className={`seld-btn seld-tab-folder ${sidebarWidth < HEADER_BREAK_WIDTH ? "seld-btn-icon-circle" : ""} ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")} data-tippy-content="Settings">
            {sidebarWidth < HEADER_BREAK_WIDTH ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            ) : (
              "Settings"
            )}
          </button>
          <button className={`seld-btn seld-tab-folder ${sidebarWidth < HEADER_BREAK_WIDTH ? "seld-btn-icon-circle" : ""} ${view === "info" ? "active" : ""}`} onClick={() => setView("info")} data-tippy-content="Info">
            {sidebarWidth < HEADER_BREAK_WIDTH ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11.5" cy="6" r="0.5" fill="currentColor"></circle>
                <line x1="11.5" y1="11" x2="11.5" y2="19"></line>
                <line x1="9.5" y1="11" x2="11.5" y2="11"></line>
                <line x1="8.5" y1="19" x2="14.5" y2="19"></line>
              </svg>
            ) : (
              "Info"
            )}
          </button>

          {onClose && (
            <button className="seld-btn seld-btn-secondary seld-btn-icon-circle" onClick={onClose} data-tippy-content="Close Sidebar">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>

      {view === "search" && (
        <>
          <div className="search-input-section">
            <div className="search-input-wrapper">
              <input
                type="text"
                value={query}
                onChange={e => {
                  setQuery(e.target.value);
                  setSearchBooster(null);
                }}
                placeholder="Search..."
                className="search-input"
              />
              {query && (
                <button
                  className="seld-btn seld-btn-ghost seld-btn-icon-circle search-copy-btn"
                  data-tippy-content="Copy search text"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(query);
                      setToastMessage("Copied!");
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 2000);
                    } catch {
                      setToastMessage("Failed to copy");
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 2000);
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="sidebar-content-area">
            <div ref={listRef} className="headword-result-list custom-scroll dynamic-font" style={{ height: `${listHeight}%`, flex: "none" }}>
              {results.length > 0 ? (
                results.map((entry, idx) => (
                  <div key={idx} ref={selectedWord === entry.word ? selectedRef : null} className={`headword-result-item ${selectedWord === entry.word ? "selected" : ""}`} onClick={() => handleSelectWord(entry.word, entry.originalQuery)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Highlighter text={entry.word} searchTerm={query} />
                      {transliterateSinhala && /[\u0D80-\u0DFF]/.test(entry.word) && <span className="seld-transliteration"> {transliterateSinhalaTxt(entry.word)}</span>}
                    </div>
                    {import.meta.env.DEV && (
                      <span className="entry-score">
                        {entry.matchPriority !== undefined && `P${entry.matchPriority}`}
                        {entry.fuzzyDist !== undefined && ` D${entry.fuzzyDist}`}
                        {entry.vowelScore !== undefined && ` V${entry.vowelScore.toFixed(1)}`}
                        {entry.suffixCount !== undefined && ` S${entry.suffixCount}`}
                      </span>
                    )}
                  </div>
                ))
              ) : query.trim() ? (
                <div className="no-results">
                  <div>No results found</div>
                  <CarterFallbackLink searchTerm={query} />
                  <a href={`https://jotform.com/260678120991058?q2_textbox0=${encodeURIComponent(query)}&q4_textbox2=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="seld-btn seld-btn-primary suggest-link-btn">
                    Suggest Definition
                  </a>
                </div>
              ) : null}
            </div>
            <div className="resize-divider" onMouseDown={startVerticalResizing}></div>
            <div className="sidebar-definition-area custom-scroll dynamic-font">
              {definition ? (
                <DefinitionCard
                  word={selectedWord!}
                  definition={definition}
                  transliterateSinhala={transliterateSinhala}
                  onWordClick={(word, fallbackWord) => {
                    setQuery(word);
                    if (fallbackWord) {
                      handleSearch(word, fallbackWord);
                    } else {
                      handleSearch(word);
                    }
                  }}
                  onSpeakClick={handleSpeak}
                  onCopyClick={handleCopy}
                  ttsWord={selectedOriginalQuery || undefined}
                  showExplorerLink={true}
                  onExplorerClick={handleExplorerClick}
                  isFavorite={favorites.includes(selectedWord!)}
                  favoritesList={favorites}
                  onToggleFavorite={handleToggleFavorite}
                />
              ) : !query ? (
                <div className="empty-state">Highlight text or double click to look up</div>
              ) : results.length > 0 ? (
                <div className="empty-state">Select a word</div>
              ) : null}
            </div>
          </div>
        </>
      )}

      {view === "settings" && (
        <SettingsUI
          theme={theme}
          setTheme={setTheme}
          sidebarPosition={sidebarPosition}
          setSidebarPosition={setSidebarPosition}
          fontSize={fontSize}
          setFontSize={setFontSize}
          ctrlClickLookup={ctrlClickLookup}
          setCtrlClickLookup={setCtrlClickLookup}
          underlineDictionaryWords={underlineDictionaryWords}
          setUnderlineDictionaryWords={setUnderlineDictionaryWords}
          autoPlayTTS={autoPlayTTS}
          setAutoPlayTTS={(val) => {
            setAutoPlayTTS(val);
            autoPlayTTSRef.current = val;
          }}
          overrideSinhalaFont={overrideSinhalaFont}
          setOverrideSinhalaFont={setOverrideSinhalaFont}
          transliterateSinhala={transliterateSinhala}
          setTransliterateSinhala={setTransliterateSinhala}
          sitePatches={sitePatches}
          setSitePatches={setSitePatches}
          saveSetting={saveSetting}
        />
      )}

      {view === "info" && <InfoUI />}
      {showToast && <div className="dict-toast">{toastMessage}</div>}
    </div>
  );
}

export default App;
