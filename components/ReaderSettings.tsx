"use client";

import React, { useEffect, useCallback } from "react";

export type ReaderFont = "reader" | "body";

export interface ReaderPrefs {
  fontSize: number;
  lineHeight: number;
  fontFamily: ReaderFont;
}

export const PREFS_KEY = "focusread-reader-prefs";

export const DEFAULT_PREFS: ReaderPrefs = {
  fontSize: 20,
  lineHeight: 2.0,
  fontFamily: "reader",
};

export function loadPrefs(): ReaderPrefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(PREFS_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(prefs: ReaderPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

interface ReaderSettingsProps {
  open: boolean;
  onClose: () => void;
  fontSize: number;
  setFontSize: (v: number) => void;
  lineHeight: number;
  setLineHeight: (v: number) => void;
  fontFamily: ReaderFont;
  setFontFamily: (v: ReaderFont) => void;
  theme: "dark" | "light";
  onToggleTheme: () => void;
}

export default function ReaderSettings({
  open,
  onClose,
  fontSize,
  setFontSize,
  lineHeight,
  setLineHeight,
  fontFamily,
  setFontFamily,
  theme,
  onToggleTheme,
}: ReaderSettingsProps) {
  // Escape key to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Persist on every change
  useEffect(() => {
    if (!open) return;
    savePrefs({ fontSize, lineHeight, fontFamily });
  }, [fontSize, lineHeight, fontFamily, open]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) onClose();
    },
    [onClose]
  );

  if (!open) return null;

  const fontFamilyValue =
    fontFamily === "reader" ? "var(--font-reader), serif" : "var(--font-body), sans-serif";

  return (
    <div
      className="settings-backdrop"
      onMouseDown={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-label="Reading Settings"
    >
      <div className="settings-panel animate-modal-enter-bounce">
        {/* Header */}
        <div className="settings-header">
          <span className="settings-title">Reading Settings</span>
          <button
            onClick={onClose}
            className="settings-close-btn"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-body">
          {/* ── Typography ── */}
          <section className="settings-section">
            <div className="settings-section-label">Typography</div>

            {/* Font Size */}
            <div className="settings-row">
              <div className="settings-row-header">
                <span className="settings-row-label">Font Size</span>
                <span className="settings-row-value">{fontSize}px</span>
              </div>
              <input
                id="settings-font-size"
                type="range"
                min={14}
                max={32}
                step={1}
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="settings-slider"
                aria-label="Font size"
              />
              <div className="settings-slider-labels">
                <span>Aa</span>
                <span style={{ fontSize: 18 }}>Aa</span>
              </div>
            </div>

            {/* Line Height */}
            <div className="settings-row">
              <div className="settings-row-header">
                <span className="settings-row-label">Line Spacing</span>
                <span className="settings-row-value">{lineHeight.toFixed(1)}×</span>
              </div>
              <input
                id="settings-line-height"
                type="range"
                min={1.4}
                max={2.6}
                step={0.1}
                value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))}
                className="settings-slider"
                aria-label="Line spacing"
              />
              <div className="settings-slider-labels">
                <span>Compact</span>
                <span>Airy</span>
              </div>
            </div>

            {/* Typeface */}
            <div className="settings-row">
              <div className="settings-row-header">
                <span className="settings-row-label">Typeface</span>
              </div>
              <div className="settings-pill-group" role="group" aria-label="Typeface">
                <button
                  id="settings-typeface-serif"
                  className={`settings-pill ${fontFamily === "reader" ? "settings-pill-active" : ""}`}
                  onClick={() => setFontFamily("reader")}
                  style={{ fontFamily: "var(--font-reader), serif" }}
                >
                  Serif
                  <span className="settings-pill-preview" style={{ fontFamily: "var(--font-reader), serif" }}>
                    Aa
                  </span>
                </button>
                <button
                  id="settings-typeface-sans"
                  className={`settings-pill ${fontFamily === "body" ? "settings-pill-active" : ""}`}
                  onClick={() => setFontFamily("body")}
                  style={{ fontFamily: "var(--font-body), sans-serif" }}
                >
                  Sans
                  <span className="settings-pill-preview" style={{ fontFamily: "var(--font-body), sans-serif" }}>
                    Aa
                  </span>
                </button>
              </div>
            </div>

            {/* Live preview */}
            <div
              className="settings-preview-text"
              style={{
                fontSize,
                lineHeight,
                fontFamily: fontFamilyValue,
              }}
            >
              The art of reading is the art of adopting a writer's world.
            </div>
          </section>

          <div className="settings-divider" />

          {/* ── Display ── */}
          <section className="settings-section">
            <div className="settings-section-label">Display</div>

            {/* Theme toggle */}
            <div className="settings-row settings-row-inline">
              <div className="settings-row-left">
                <span className="settings-row-label">
                  {theme === "dark" ? "🌙 Dark Mode" : "☀️ Light Mode"}
                </span>
                <span className="settings-row-sub">
                  {theme === "dark" ? "Easy on the eyes" : "Better in bright rooms"}
                </span>
              </div>
              <button
                id="settings-theme-toggle"
                role="switch"
                aria-checked={theme === "dark"}
                onClick={onToggleTheme}
                className={`settings-theme-track ${theme === "dark" ? "settings-theme-track-on" : ""}`}
                aria-label="Toggle dark mode"
              >
                <span className={`settings-theme-thumb ${theme === "dark" ? "settings-theme-thumb-on" : ""}`} />
              </button>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="settings-footer">
          <button
            onClick={() => {
              setFontSize(DEFAULT_PREFS.fontSize);
              setLineHeight(DEFAULT_PREFS.lineHeight);
              setFontFamily(DEFAULT_PREFS.fontFamily);
            }}
            className="settings-reset-btn"
          >
            Reset to defaults
          </button>
          <button onClick={onClose} className="settings-done-btn" id="settings-done">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
