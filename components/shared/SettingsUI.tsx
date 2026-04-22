import React, { useState } from "react";
import { Theme } from "./types";
import "./SettingsUI.css";

const SINHALA_FONTS: { value: string; label: string }[] = [
  { value: "Noto Sans Sinhala", label: "Noto Sans" },
  { value: "Google Sans", label: "Google Sans" },
  { value: "Abhaya Libre", label: "Abhaya Libre" },
  { value: "system", label: "System Default" },
];

const SINHALA_SAMPLE = "සිංහල හෝඩිය";

const SinhalaFontPicker: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const current = SINHALA_FONTS.find(f => f.value === value) ?? SINHALA_FONTS[0];

  return (
    <div className="seld-font-picker">
      <label className="settings-label">Sinhala Font</label>
      <button
        className="seld-font-picker-trigger seld-btn seld-btn-secondary"
        onClick={() => setOpen(o => !o)}
        type="button"
      >
        <span className="seld-font-picker-label">{current.label}</span>
        <span className="seld-font-picker-sample" style={{ fontFamily: current.value === "system" ? "system-ui, sans-serif" : current.value }}>
          {SINHALA_SAMPLE}
        </span>
        <svg className="seld-font-picker-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <ul className="seld-font-picker-list">
          {SINHALA_FONTS.map(font => (
            <li
              key={font.value}
              className={`seld-font-picker-option${font.value === value ? " selected" : ""}`}
              onClick={() => { onChange(font.value); setOpen(false); }}
            >
              <span className="seld-font-picker-option-label">{font.label}</span>
              <span className="seld-font-picker-option-sample" style={{ fontFamily: font.value === "system" ? "system-ui, sans-serif" : font.value }}>
                {SINHALA_SAMPLE}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

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
  sinhalaFont: string;
  setSinhalaFont: (val: string) => void;
  interceptLinkClicks: boolean;
  setInterceptLinkClicks: (val: boolean) => void;
  selectionCopyThreshold: number;
  setSelectionCopyThreshold: (val: number) => void;
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
  sinhalaFont,
  setSinhalaFont,
  interceptLinkClicks,
  setInterceptLinkClicks,
  selectionCopyThreshold,
  setSelectionCopyThreshold,
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
        <SinhalaFontPicker
          value={sinhalaFont}
          onChange={val => {
            setSinhalaFont(val);
            saveSetting("seldSinhalaFont", val);
          }}
        />
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
        <div className="settings-control" style={{ marginTop: '10px' }}>
          <label className="settings-label" style={{ fontSize: '0.85em', opacity: 0.8, marginBottom: '4px', display: 'block' }}>
            Copy selection if longer than
          </label>
          <div className="slider-container" style={{ maxWidth: '240px' }}>
            <input
              type="range"
              min="0"
              max="200"
              step="10"
              value={selectionCopyThreshold}
              onChange={e => {
                const val = parseInt(e.target.value);
                setSelectionCopyThreshold(val);
                saveSetting("seldSelectionCopyThreshold", val);
              }}
            />
            <span
              className="slider-value"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setSelectionCopyThreshold(0);
                saveSetting("seldSelectionCopyThreshold", 0);
              }}
            >
              {selectionCopyThreshold === 0 ? "Off" : `${selectionCopyThreshold} chars`}
            </span>
          </div>
        </div>
      </div>
      <div className="settings-group">
        <label className="settings-label">Experimental</label>
        <div data-tippy-content="Removes the page sidebar on the following sites when the Dictionary sidebar is open to improve usability. May cause unexpected results.<br>• BBC.com<br>• wikipedia.org<br>• mahamegha.lk<br>• lankadeepa.lk<br>• hirunews.lk<br>• news.lk<br>• adaderana.lk<br>• reddit.com" className="settings-control"
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
        <div data-tippy-content="Prevents clicking on links from opening a new page, and instead looks up the word you clicked on. Ideal for studying Sinhala text with lots of links." className="settings-control">
          <label className="checkbox-container">
            <input
              type="checkbox"
              checked={interceptLinkClicks}
              onChange={e => {
                const val = e.target.checked;
                setInterceptLinkClicks(val);
                saveSetting("seldInterceptLinkClicks", val);
              }}
            />
            <span className="custom-checkbox"></span>
            <span className="checkbox-label">Intercept link clicks to Dictionary</span>
          </label>
        </div>
      </div>
    </div>
  );
};
