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
  transliterateSinhala: boolean;
  setTransliterateSinhala: (val: boolean) => void;
  sitePatches: boolean;
  setSitePatches: (val: boolean) => void;
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
  transliterateSinhala,
  setTransliterateSinhala,
  sitePatches,
  setSitePatches,
  saveSetting,
}) => {
  return (
    <div className="settings-panel blur custom-scroll">
      <div className="settings-group">
        <label className="settings-label">Appearance</label>
        <div className="settings-control-row"
          data-tippy-content="“System” uses whatever your device has set as the default.">
          {(["system", "light", "dark"] as Theme[]).map(t => (
            <button
              key={t}
              className={`seld-btn seld-btn-secondary toggle-btn ${theme === t ? "active" : ""}`}
              onClick={() => {
                setTheme(t);
                saveSetting("theme", t);
              }}>
              {t.toUpperCase()}
            </button>
          ))}
          {sidebarPosition && setSidebarPosition && (
            <button

              className="seld-btn seld-btn-secondary seld-btn-icon-circle header-action-btn"
              onClick={() => {
                const newPos = sidebarPosition === 'right' ? 'left' : 'right';
                setSidebarPosition(newPos);
                saveSetting("seldSidebarPosition", newPos);
              }}
              data-tippy-content={`Move this sidebar to ${sidebarPosition === 'right' ? 'left' : 'right'}`}
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
            step="5"
            value={fontSize}
            onChange={e => {
              const val = parseInt(e.target.value);
              setFontSize(val);
              saveSetting("fontSize", val);
            }}
          />
          <span
            className="slider-value"
            style={{ cursor: "pointer" }}
            onClick={() => {
              setFontSize(100);
              saveSetting("fontSize", 100);
            }}
          >
            {fontSize}%
          </span>
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

          <label className="checkbox-container"
            data-tippy-content="If a word is an exact match in the dictionary it will have an underline.">
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

          <label className="checkbox-container"
            data-tippy-content="Automatically play the headword after clicking on word on the page. Experimental &#x1F9EA;"
            data-tippy-allowhtml="true">
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

          <label className="checkbox-container"
            data-tippy-content="Forces <em>Noto Sans Sinhala</em> font on the current page. May cause unexpected results." data-tippy-allowhtml="true">
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
          <label className="checkbox-container"
            data-tippy-content="Add transliteration of<br>Sinhala letters into the<br>international style. E.g.:<br>ඇ = æ<br>ඈ = ǣ<br>ට් = ṭ<br>ඨ් = ṭh<br>ත් = t<br>ථ් = th<br>ඳ් = n̆d<br>etc.<br>"
            data-tippy-allowhtml="true"
          >
            <input
              type="checkbox"
              checked={transliterateSinhala}
              onChange={e => {
                const val = e.target.checked;
                setTransliterateSinhala(val);
                saveSetting("transliterateSinhala", val);
              }}
            />
            <span className="custom-checkbox"></span>
            <span className="checkbox-label">Transliterate Sinhala</span>
          </label>
        </div>
      </div>
      <div className="settings-group">
        <label className="settings-label">Experimental</label>
        <div data-tippy-content="Removes the page sidebar on the following sites when the Dictionary sidebar is open to improve usability. May cause unexpected results.<br>• wikipedia.org<br>• mahamegha.lk<br>• lankadeepa.lk<br>• hirunews.lk<br>• news.lk<br>• adaderana.lk<br>• reddit.com" className="settings-control"
          data-tippy-allowhtml="true">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={sitePatches}
              onChange={e => {
                const val = e.target.checked;
                setSitePatches(val);
                saveSetting("seldSitePatches", val);
              }}
            />
            <span className="custom-checkbox"></span>
            <span className="checkbox-label">Fix page layout for supported sites</span>
          </label>
        </div>
      </div>
    </div>
  );
};
