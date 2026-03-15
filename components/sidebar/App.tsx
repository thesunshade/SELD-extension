import React, { useState, useEffect, useRef } from "react";
import { stardict, IndexEntry, StructuredDefinition } from "../../utils/stardict";
import { extractUniqueSinhalaWords, applyHighlights } from "../../utils/dom-highlights";
import { transliterateSinhala } from "../../utils/transliterate";
import { browser } from "wxt/browser";
import { getCopyText } from "../../utils/clipboard";
import { DefinitionCard } from "../shared/DefinitionCard";

import { SettingsUI } from "../shared/SettingsUI";
import { Theme } from "../shared/types";

type View = "search" | "settings" | "info";

interface AppProps {
  onClose?: () => void;
}

function App({ onClose }: AppProps) {
  const [view, setView] = useState<View>("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<IndexEntry[]>([]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<StructuredDefinition[] | null>(null);

  // Settings state
  const [theme, setTheme] = useState<Theme>("system");
  const [fontSize, setFontSize] = useState(100);
  const [ctrlClickLookup, setCtrlClickLookup] = useState(true);
  const [underlineDictionaryWords, setUnderlineDictionaryWords] = useState(true);
  const [autoPlayTTS, setAutoPlayTTS] = useState(false);
  const [overrideSinhalaFont, setOverrideSinhalaFont] = useState(false);

  // Transliteration settings
  const [transliterateHeadwords, setTransliterateHeadwords] = useState(false);
  const [transliterateResults, setTransliterateResults] = useState(false);
  const [transliterateDefinitions, setTransliterateDefinitions] = useState(false);
  const [sidebarPosition, setSidebarPosition] = useState<'left' | 'right'>('right');

  const autoPlayTTSRef = useRef(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
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
      seldTransliterateHeadwords: v => setTransliterateHeadwords(v as boolean),
      seldTransliterateResults: v => setTransliterateResults(v as boolean),
      seldTransliterateDefinitions: v => setTransliterateDefinitions(v as boolean),
      seldSidebarPosition: v => setSidebarPosition(v as 'left' | 'right'),
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
      const query = (e as CustomEvent).detail;
      if (query) {
        setQuery(query);
        handleSearch(query);
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

  const handleCopy = async (targetWord: string, specificDefBlock?: string | string[]) => {
    if (!targetWord || !specificDefBlock) return;

    try {
      const { htmlContent, plainText } = getCopyText(targetWord, specificDefBlock);

      const blobHtml = new Blob([htmlContent], { type: "text/html" });
      const blobText = new Blob([plainText], { type: "text/plain" });

      const data = [
        new ClipboardItem({
          "text/html": blobHtml,
          "text/plain": blobText,
        }),
      ];

      await navigator.clipboard.write(data);
      setToastMessage("Entry copied!");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
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

  const startSidebarResizing = (e: React.MouseEvent) => {
    isResizingSidebar.current = true;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";
  };

  const saveSetting = (key: string, value: any) => {
    browser.storage.local.set({ [key]: value });
  };

  return (
    <div
      id="seld-sidebar-inner"
      className={`seld-sidebar-container seld-theme-vars ${themeClass} ${sidebarPosition === 'left' ? 'left-position' : ''}`}
      style={{
        "--font-size-percent": `${fontSize}%`,
        // Add these lines to handle the position dynamically
        position: 'fixed',
        top: 0,
        [sidebarPosition]: 0, // This evaluates to either left: 0 or right: 0
        [sidebarPosition === 'right' ? 'left' : 'right']: 'auto', // Resets the other side
        width: `${sidebarWidth}px`,
        height: '100vh',
        zIndex: 2147483647
      } as any}
    >
      <div className="sidebar-resize-handle" onMouseDown={startSidebarResizing}></div>
      <div className="header-row">
        <div className="history-nav">
          <button className="history-btn" onClick={goBack} disabled={historyIndex.current <= 0} title="Go back">
            &lt;
          </button>
          <button className="history-btn" onClick={goForward} disabled={historyIndex.current >= history.length - 1} title="Go forward">
            &gt;
          </button>
        </div>
        {!isResizingSidebar.current && sidebarWidth < 300 ? "" : "SELD"}
        <div className="header-actions">
          <button className={`header-action-btn ${sidebarWidth < 400 ? "icon-only" : ""} ${view === "search" ? "active" : ""}`} onClick={() => setView("search")} title="Search">
            {sidebarWidth < 400 ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            ) : (
              "Search"
            )}
          </button>
          <button className={`header-action-btn ${sidebarWidth < 400 ? "icon-only" : ""} ${view === "settings" ? "active" : ""}`} onClick={() => setView("settings")} title="Settings">
            {sidebarWidth < 400 ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            ) : (
              "Settings"
            )}
          </button>
          <button className={`header-action-btn ${sidebarWidth < 400 ? "icon-only" : ""} ${view === "info" ? "active" : ""}`} onClick={() => setView("info")} title="Info">
            {sidebarWidth < 400 ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
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
            <button className="header-action-btn icon-only" onClick={onClose} title="Close Sidebar">
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
          <div className="search-section">
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value);
                handleSearch(e.target.value);
              }}
              placeholder="Search..."
              className="search-input"
            />
          </div>
          <div className="content-area">
            <div className="headword-list custom-scroll dynamic-font" style={{ height: `${listHeight}%`, flex: "none" }}>
              {results.length > 0 ? (
                results.map((entry, idx) => (
                  <div key={idx} ref={selectedWord === entry.word ? selectedRef : null} className={`headword-item ${selectedWord === entry.word ? "selected" : ""}`} onClick={() => handleSelectWord(entry.word)}>
                    {entry.word}
                    {transliterateResults && /[\u0D80-\u0DFF]/.test(entry.word) && <span className="seld-transliteration"> {transliterateSinhala(entry.word)}</span>}
                  </div>
                ))
              ) : query.trim() ? (
                <div className="no-results">
                  <div>No results found</div>
                  <a href={`https://jotform.com/260678120991058?q2_textbox0=${encodeURIComponent(query)}&q4_textbox2=${encodeURIComponent(window.location.href)}`} target="_blank" rel="noopener noreferrer" className="suggest-link-btn">
                    Suggest Definition
                  </a>
                </div>
              ) : null}
            </div>
            <div className="resize-divider" onMouseDown={startVerticalResizing}></div>
            <div className="definition-area custom-scroll dynamic-font">
              {definition ? (
                <DefinitionCard
                  word={selectedWord!}
                  definition={definition}
                  transliterateHeadwords={transliterateHeadwords}
                  transliterateDefinitions={transliterateDefinitions}
                  onWordClick={word => {
                    setQuery(word);
                    handleSearch(word);
                  }}
                  onSpeakClick={handleSpeak}
                  onCopyClick={handleCopy}
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
          transliterateHeadwords={transliterateHeadwords}
          setTransliterateHeadwords={setTransliterateHeadwords}
          transliterateResults={transliterateResults}
          setTransliterateResults={setTransliterateResults}
          transliterateDefinitions={transliterateDefinitions}
          setTransliterateDefinitions={setTransliterateDefinitions}
          saveSetting={saveSetting}
        />
      )}

      {view === "info" && (
        <div className="info-pane glassmorphism custom-scroll">
          <h3>About SELD Dictionary</h3>
          <p>Sinhala-English Learner's Dictionary (SELD).</p>
          <p>Double click or select words to look up.</p>
          <p>Text to speech provided by Google.</p>
          <details>
            <summary>Pages to try</summary>
            <p>The following pages have good coverage in the SELD</p>
            <ul className="test-sites">
              <li>
                <a rel="noreferrer" target="_blank" href="https://mahamegha.lk/2022/04/23/sirapa-wandanawa/">
                  සිරිපා වන්දනාවේ ගිය ගැමි කවියෝ
                </a>
              </li>
              <li>
                <a rel="noreferrer" target="_blank" href="https://tripitaka.online/sutta/7478">
                  අංගුත්තර නිකාය තික නිපාතෝ 3.1.1.1.{" "}
                </a>
              </li>
            </ul>
          </details>
        </div>
      )}
      {showToast && <div className="toast-notification">{toastMessage}</div>}
    </div>
  );
}

export default App;
