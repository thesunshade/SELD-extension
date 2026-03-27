import React, { useState, useRef, useEffect } from "react";
import { transliterateSinhala as transliterateSinhalaTxt } from "../../utils/transliterate";

interface HistoryNavProps {
  history: string[];
  historyIndex: React.MutableRefObject<number>;
  transliterateSinhala: boolean;
  onGoBack: () => void;
  onGoForward: () => void;
  onWordClick: (word: string) => void;
  onClear: () => void;
  onDownload: () => void;
}

export function HistoryNav({
  history,
  historyIndex,
  transliterateSinhala,
  onGoBack,
  onGoForward,
  onWordClick,
  onClear,
  onDownload,
}: HistoryNavProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const toggleBtnRef = useRef<HTMLButtonElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showDropdown) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        toggleBtnRef.current && !toggleBtnRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleWordClick = (word: string) => {
    onWordClick(word);
    setShowDropdown(false);
  };

  const handleClear = () => {
    onClear();
    setShowDropdown(false);
  };

  const handleDownload = () => {
    onDownload();
    setShowDropdown(false);
  };

  return (
    <div className="history-nav">
      <button
        className="seld-btn seld-btn-secondary history-btn"
        onClick={onGoBack}
        disabled={historyIndex.current <= 0}
        title="Go back"
      >
        &lt;
      </button>
      <button
        className="seld-btn seld-btn-secondary history-btn"
        onClick={onGoForward}
        disabled={historyIndex.current >= history.length - 1}
        title="Go forward"
      >
        &gt;
      </button>
      <button
        className="seld-btn seld-btn-secondary history-btn"
        ref={toggleBtnRef}
        onClick={() => setShowDropdown(prev => !prev)}
        disabled={history.length === 0}
        title="History"
      >
        &#9662;
      </button>
      {showDropdown && history.length > 0 && (
        <div className="history-dropdown" ref={dropdownRef}>
          <div className="history-dropdown-list custom-scroll">
            {[...new Set([...history].reverse())].map((word, idx) => (
              <div key={idx} className="history-dropdown-item" onClick={() => handleWordClick(word)}>
                {word}
                {transliterateSinhala && /[\u0D80-\u0DFF]/.test(word) && (
                  <span className="seld-transliteration"> {transliterateSinhalaTxt(word)}</span>
                )}
              </div>
            ))}
          </div>
          <div className="history-dropdown-footer">
            <button className="seld-btn seld-btn-secondary history-dropdown-btn" onClick={handleClear} title="Clear History">
              Clear
            </button>
            <button className="seld-btn seld-btn-secondary history-dropdown-btn" onClick={handleDownload} title="Download History">
              Download
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
