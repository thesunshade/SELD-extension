import React from "react";
import { Theme } from "./types";
import "./SettingsUI.css";

interface SettingsUIProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  sidebarPosition?: "left" | "right";
  setSidebarPosition?: (pos: "left" | "right") => void;
  fontSize: number;
  setFontSize: (size: number) => void;
  ctrlClickLookup: boolean;
  setCtrlClickLookup: (val: boolean) => void;
  underlineDictionaryWords: boolean;
  setUnderlineDictionaryWords: (val: boolean) => void;
  autoPlayTTS: boolean;
  setAutoPlayTTS: (val: boolean) => void;
  overrideSinhalaFont: boolean;
  setOverrideSinhalaFont: (val: boolean) => void;
  transliterateHeadwords: boolean;
  setTransliterateHeadwords: (val: boolean) => void;
  transliterateResults: boolean;
  setTransliterateResults: (val: boolean) => void;
  transliterateDefinitions: boolean;
  setTransliterateDefinitions: (val: boolean) => void;
  saveSetting: (key: string, value: any) => void;
}

export const SettingsUI: React.FC<SettingsUIProps> = ({
  theme,
  setTheme,
  sidebarPosition,
  setSidebarPosition,
  fontSize,
  setFontSize,
  ctrlClickLookup,
  setCtrlClickLookup,
  underlineDictionaryWords,
  setUnderlineDictionaryWords,
  autoPlayTTS,
  setAutoPlayTTS,
  overrideSinhalaFont,
  setOverrideSinhalaFont,
  transliterateHeadwords,
  setTransliterateHeadwords,
  transliterateResults,
  setTransliterateResults,
  transliterateDefinitions,
  setTransliterateDefinitions,
  saveSetting,
}) => {
  return (
    <div className="settings-panel glassmorphism custom-scroll">
      <div className="settings-group">
        <label className="settings-label">Appearance</label>
        <div className="settings-control-row">
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
          {sidebarPosition && setSidebarPosition && (
            <button
              className="header-action-btn icon-only"
              onClick={() => {
                const newPos = sidebarPosition === 'right' ? 'left' : 'right';
                setSidebarPosition(newPos);
                saveSetting("seldSidebarPosition", newPos);
              }}
              title={`Move to ${sidebarPosition === 'right' ? 'left' : 'right'}`}
              style={{ marginLeft: '8px' }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                fill="none"
                viewBox="0 0 24 24"
                style={{ transform: sidebarPosition === 'right' ? 'scaleX(-1)' : 'none' }}
              >
                <rect
                  x="2"
                  y="2"
                  width="20"
                  height="20"
                  rx="3"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 2v20"
                />
                <path
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m11 12 6 0m0 0-2-2m2 2-2 2"
                />
              </svg>
            </button>
          )}
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
  );
};
