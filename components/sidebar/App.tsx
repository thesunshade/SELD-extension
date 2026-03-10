import React, { useState, useEffect, useRef } from "react";
import { stardict, IndexEntry, StructuredDefinition } from "../../utils/stardict";
import { extractUniqueSinhalaWords, applyHighlights } from "../../utils/dom-highlights";
import { transliterateSinhala } from "../../utils/transliterate";
import { browser } from "wxt/browser";

type View = "search" | "settings" | "info";
type Theme = "light" | "dark" | "system";

function App() {
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
      theme: (v) => setTheme(v as Theme),
      fontSize: (v) => setFontSize(v as number),
      seldCtrlClickLookup: (v) => setCtrlClickLookup(v as boolean),
      seldUnderlineWords: (v) => setUnderlineDictionaryWords(v as boolean),
      seldAutoPlayTTS: (v) => {
        setAutoPlayTTS(v as boolean);
        autoPlayTTSRef.current = v as boolean;
      },
      seldOverrideSinhalaFont: (v) => setOverrideSinhalaFont(v as boolean),
      sidebarWidth: (v) => setSidebarWidth(v as number),
      listHeight: (v) => setListHeight(v as number),
      seldTransliterateHeadwords: (v) => setTransliterateHeadwords(v as boolean),
      seldTransliterateResults: (v) => setTransliterateResults(v as boolean),
      seldTransliterateDefinitions: (v) => setTransliterateDefinitions(v as boolean),
    };

    const keys = Object.keys(settingsConfig);

    // Initial load
    browser.storage.local.get(keys).then((res) => {
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

    window.addEventListener("mousemove", handleGlobalMouseMove);
    window.addEventListener("mouseup", handleGlobalMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleGlobalMouseMove);
      window.removeEventListener("mouseup", handleGlobalMouseUp);
    };
  }, []);

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

  const stripHtml = (html: string) => {
    let textWithNewlines = html
      .replace(/<hr[^>]*>/gi, "\n\n")
      .replace(/<br[^>]*>/gi, "\n")
      .replace(/<\/div>/gi, "\n")
      .replace(/<\/p>/gi, "\n\n")
      .replace(/<div class="synthesized-header"[^>]*>/gi, "\n");

    const tmp = document.createElement("DIV");
    tmp.innerHTML = textWithNewlines;
    return (tmp.textContent || tmp.innerText || "").replace(/\n\s*\n/g, "\n\n").trim();
  };

  const getCopyText = (word: string, defs: string | string[]) => {
    const joinedDef = Array.isArray(defs) ? defs.join("<hr/>") : defs;
    const htmlContent = `<h2>${word}</h2><div>${joinedDef}</div>`;
    const plainText = `${word}\n\n${stripHtml(joinedDef)}`;
    return { htmlContent, plainText };
  };

  const getFullEntryCopyData = (word: string, defs: StructuredDefinition[]) => {
    let allDefs: string[] = [];
    if (defs.length > 1) {
      allDefs = defs.map(b => {
        const header = `<div style="font-weight: bold; font-size: 1.2em; margin-bottom: 8px; margin-top: 4px;">${b.headword}</div><br/>`;
        const homographs = b.homographDefinitions.join("<hr/>");
        return `${header}${homographs}`;
      });
    } else {
      allDefs = defs[0].homographDefinitions;
    }
    return getCopyText(word, allDefs);
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
    // Added \u200D (ZWJ) and \u200C (ZWNJ) to the regex
    const tokens = text.split(/([^a-zA-Z\u0D80-\u0DFF\u200D\u200C]+)/).filter(Boolean);
    const elements: React.ReactNode[] = [];

    let i = 0;
    while (i < tokens.length) {
      const token = tokens[i];
      // Check for Sinhala including joiners
      const isWord = /[a-zA-Z\u0D80-\u0DFF\u200D\u200C]/.test(token);
      const isSinhala = /[\u0D80-\u0DFF\u200D\u200C]/.test(token);
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
              <span
                key={k}
                className="clickable-word"
                onClick={e => {
                  e.stopPropagation();
                  setQuery(t);
                  handleSearch(t);
                }}>
                {t}
              </span>,
            );
          } else {
            elements.push(<span key={k}>{t}</span>);
          }
        }

        if (transliterateDefinitions) {
          elements.push(
            <span key={`t-${i}`} className="seld-transliteration">
              {" "}
              [{transliterateSinhala(phraseForTranslit.trim())}]
            </span>,
          );
        }

        i = lastSinhalaIndex + 1;
      } else if (isEnglish) {
        elements.push(
          <span
            key={i}
            className="clickable-word"
            onClick={e => {
              e.stopPropagation();
              setQuery(token);
              handleSearch(token);
            }}>
            {token}
          </span>,
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
    const doc = parser.parseFromString(html, "text/html");
    // Remove style and script tags to prevent leakage or execution
    const styles = doc.querySelectorAll("style, script");
    styles.forEach(s => s.remove());

    const convertNode = (node: Node, key: string): React.ReactNode => {
      if (node.nodeType === Node.TEXT_NODE) return <React.Fragment key={key}>{renderTextWithClicks(node.textContent || "")}</React.Fragment>;
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = node as HTMLElement;
        const tagName = element.tagName.toLowerCase();
        const children = Array.from(element.childNodes).map((child, i) => convertNode(child, `${key}-${i}`));

        // Final cleanup: remove color from style attribute if it exists
        if (element.style && element.style.color) {
          element.style.color = "";
        }

        switch (tagName) {
          case "br":
            return <br key={key} />;
          case "hr":
            return <hr key={key} className={element.className} />;
          case "b":
          case "strong":
            return (
              <strong key={key} className={element.className}>
                {children}
              </strong>
            );
          case "i":
          case "em":
            return (
              <em key={key} className={element.className}>
                {children}
              </em>
            );
          case "u":
            return (
              <u key={key} className={element.className}>
                {children}
              </u>
            );
          case "p":
            return (
              <p key={key} className={element.className} style={{ color: "inherit" }}>
                {children}
              </p>
            );
          case "div":
            return (
              <div key={key} className={element.className} style={{ color: "inherit" }}>
                {children}
              </div>
            );
          case "span":
            return (
              <span key={key} className={element.className} style={{ color: "inherit" }}>
                {children}
              </span>
            );
          case "ul":
            return (
              <ul key={key} className={element.className}>
                {children}
              </ul>
            );
          case "li":
            return (
              <li key={key} className={element.className} style={{ color: "inherit" }}>
                {children}
              </li>
            );
          case "font": {
            // User suggestion: strip colors clearly. Any specific mapping should be minimal.
            // We will ignore the color attribute entirely.
            return (
              <span key={key} className={element.className} style={{ color: "inherit" }}>
                {children}
              </span>
            );
          }
          default:
            return <React.Fragment key={key}>{children}</React.Fragment>;
        }
      }
      return null;
    };
    return Array.from(doc.body.childNodes).map((node, i) => convertNode(node, `node-${i}`));
  };

  return (
    <div id="seld-sidebar-inner" className={`seld-sidebar-container ${themeClass}`} style={{ "--font-size-percent": `${fontSize}%` } as any}>
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
          <button
            className={`header-action-btn ${sidebarWidth < 400 ? "icon-only" : ""} ${view === "search" ? "active" : ""}`}
            onClick={() => setView("search")}
            title="Search"
          >
            {sidebarWidth < 400 ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            ) : (
              "Search"
            )}
          </button>
          <button
            className={`header-action-btn ${sidebarWidth < 400 ? "icon-only" : ""} ${view === "settings" ? "active" : ""}`}
            onClick={() => setView("settings")}
            title="Settings"
          >
            {sidebarWidth < 400 ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
            ) : (
              "Settings"
            )}
          </button>
          <button
            className={`header-action-btn ${sidebarWidth < 400 ? "icon-only" : ""} ${view === "info" ? "active" : ""}`}
            onClick={() => setView("info")}
            title="Info"
          >
            {sidebarWidth < 400 ? (
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="16" x2="12" y2="12"></line>
                <line x1="12" y1="8" x2="12.01" y2="8"></line>
              </svg>
            ) : (
              "Info"
            )}
          </button>
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
                  <a
                    href={`https://jotform.com/260678120991058?q2_textbox0=${encodeURIComponent(query)}&q4_textbox2=${encodeURIComponent(window.location.href)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="suggest-link-btn"
                  >
                    Suggest Definition
                  </a>
                </div>
              ) : null}
            </div>
            <div className="resize-divider" onMouseDown={startVerticalResizing}></div>
            <div className="definition-area custom-scroll dynamic-font">
              {definition ? (
                <div className="definition-box">
                  <h2 className="def-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span>{selectedWord}</span>
                      {transliterateHeadwords && /[\u0D80-\u0DFF]/.test(selectedWord || "") && (
                        <span className="seld-transliteration" style={{ fontSize: "0.6em", fontWeight: "normal", opacity: 0.8, marginTop: "2px" }}>
                          {transliterateSinhala(selectedWord!)}
                        </span>
                      )}
                    </div>
                    <div className="global-actions" style={{ display: "flex", gap: "8px" }}>
                      <a
                        href={`https://jotform.com/260678150051452?q2_textbox0=${encodeURIComponent(selectedWord || "")}&q4_textbox2=${encodeURIComponent(window.location.href)}&existingDefinition=${encodeURIComponent(getFullEntryCopyData(selectedWord!, definition!).plainText)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="report-button"
                        title="Report an error"
                      >
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                          <polyline points="22,6 12,13 2,6"></polyline>
                        </svg>
                      </a>
                      <button
                        className="copy-button"
                        onClick={() => {
                          const { plainText } = getFullEntryCopyData(selectedWord!, definition!);
                          // We still need handleCopy for original functionality if needed, but getFullEntryCopyData does the heavy lifting
                          // Actually handleCopy takes specific definitions, we can just call it with the aggregated ones
                          let allDefsHtml: string[] = [];
                          if (definition.length > 1) {
                            allDefsHtml = definition.map(b => {
                              const header = `<div style="font-weight: bold; font-size: 1.2em; margin-bottom: 8px; margin-top: 4px;">${b.headword}</div><br/>`;
                              const homographs = b.homographDefinitions.join("<hr/>");
                              return `${header}${homographs}`;
                            });
                          } else {
                            allDefsHtml = definition[0].homographDefinitions;
                          }
                          handleCopy(selectedWord!, allDefsHtml);
                        }}
                        title="Copy full entry">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                        </svg>
                      </button>
                      <button className="tts-button" onClick={() => selectedWord && handleSpeak(selectedWord)} title="Speak word">
                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                        </svg>
                      </button>
                    </div>
                  </h2>
                  <div className="definition-content">
                    {definition.map((block, bIdx) => (
                      <div key={bIdx} className="synthesized-section" style={{ marginBottom: bIdx < definition.length - 1 ? "16px" : "0" }}>
                        {/* Header for each component only if it's a compound structure */}
                        {definition.length > 1 && (
                          <div className="synthesized-header">
                            <div style={{ display: "flex", flexDirection: "column" }}>
                              <span
                                className="synthesized-header-text"
                                onClick={() => {
                                  setQuery(block.headword);
                                  handleSearch(block.headword);
                                }}
                                title="Search this word">
                                {block.headword}
                              </span>
                              {transliterateHeadwords && /[\u0D80-\u0DFF]/.test(block.headword) && (
                                <span className="seld-transliteration" style={{ fontSize: "0.8em", fontWeight: "normal", opacity: 0.8, marginTop: "2px" }}>
                                  {transliterateSinhala(block.headword)}
                                </span>
                              )}
                            </div>
                            <div style={{ display: "flex", gap: "8px", opacity: 0.8, transform: "scale(0.85)" }}>
                              <button className="copy-button" onClick={() => handleCopy(block.headword, block.homographDefinitions)} title="Copy entry">
                                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                                </svg>
                              </button>
                              <button className="tts-button" onClick={() => handleSpeak(block.headword)} title="Speak word">
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
                            {hIdx < block.homographDefinitions.length - 1 && <hr className="homograph-separator" style={{ margin: "8px 0" }} />}
                          </div>
                        ))}

                        {bIdx < definition.length - 1 && <hr style={{ margin: "16px 0", border: "none", borderTop: "2px dashed var(--border-color)" }} />}
                      </div>
                    ))}
                  </div>
                </div>
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
        <div className="settings-panel glassmorphism custom-scroll">
          <div className="settings-group">
            <label className="settings-label">Appearance</label>
            <div className="settings-control">
              {(["system", "light", "dark"] as Theme[]).map(t => (
                <button
                  key={t}
                  className={`toggle-btn ${theme === t ? "active" : ""}`}
                  onClick={() => {
                    setTheme(t);
                    saveSetting("theme", t);
                  }}>
                  {t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-group">
            <label className="settings-label">Font Size</label>
            <div className="slider-container">
              <input
                type="range"
                min="50"
                max="200"
                value={fontSize}
                onChange={e => {
                  const val = parseInt(e.target.value);
                  setFontSize(val);
                  saveSetting("fontSize", val);
                }}
              />
              <span className="slider-value">{fontSize}%</span>
            </div>
            <div className="dynamic-font" style={{ marginTop: "0.4em", color: "var(--text-primary)", textAlign: "center" }}>
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
                  onChange={e => {
                    const val = e.target.checked;
                    setCtrlClickLookup(val);
                    saveSetting("seldCtrlClickLookup", val);
                  }}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-label">Ctrl + click to look up</span>
              </label>

              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={underlineDictionaryWords}
                  onChange={e => {
                    const val = e.target.checked;
                    setUnderlineDictionaryWords(val);
                    saveSetting("seldUnderlineWords", val);
                  }}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-label">Underline words in dictionary</span>
              </label>

              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={autoPlayTTS}
                  onChange={e => {
                    const val = e.target.checked;
                    setAutoPlayTTS(val);
                    autoPlayTTSRef.current = val;
                    saveSetting("seldAutoPlayTTS", val);
                  }}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-label">Auto-play TTS for matched words</span>
              </label>

              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={overrideSinhalaFont}
                  onChange={e => {
                    const val = e.target.checked;
                    setOverrideSinhalaFont(val);
                    saveSetting("seldOverrideSinhalaFont", val);
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
                  onChange={e => {
                    const val = e.target.checked;
                    setTransliterateHeadwords(val);
                    saveSetting("seldTransliterateHeadwords", val);
                  }}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-label">Transliterate headwords</span>
              </label>

              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={transliterateResults}
                  onChange={e => {
                    const val = e.target.checked;
                    setTransliterateResults(val);
                    saveSetting("seldTransliterateResults", val);
                  }}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-label">Transliterate results list</span>
              </label>

              <label className="checkbox-container">
                <input
                  type="checkbox"
                  checked={transliterateDefinitions}
                  onChange={e => {
                    const val = e.target.checked;
                    setTransliterateDefinitions(val);
                    saveSetting("seldTransliterateDefinitions", val);
                  }}
                />
                <span className="custom-checkbox"></span>
                <span className="checkbox-label">Transliterate definitions inline</span>
              </label>
            </div>
          </div>
        </div>
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
