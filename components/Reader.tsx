"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useFloating,
  autoUpdate,
  offset,
  flip,
  shift,
  FloatingPortal,
  type VirtualElement,
} from "@floating-ui/react";
import ReaderSettings, {
  type ReaderFont,
  loadPrefs,
  savePrefs,
} from "./ReaderSettings";

type Props = {
  title: string;
  author?: string;
  chapter?: string;
  progress?: number;
  paragraphs: string[];
};

// A virtual element wrapping a DOMRect so Floating UI can anchor to it
function makeVirtualEl(rect: DOMRect): VirtualElement {
  return {
    getBoundingClientRect: () => rect,
  };
}

export default function Reader({ title, author, chapter, progress = 0, paragraphs }: Props) {
  const router = useRouter();

  // ── Focus mode ──────────────────────────────────────────────────────────────
  const [focusMode, setFocusMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  // ── Reader prefs (font size, line height, typeface) ─────────────────────────
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(2.0);
  const [fontFamily, setFontFamily] = useState<ReaderFont>("reader");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [isClient, setIsClient] = useState(false);

  // ── Settings modal ───────────────────────────────────────────────────────────
  const [settingsOpen, setSettingsOpen] = useState(false);

  // ── Word popup state ─────────────────────────────────────────────────────────
  const [wordPopup, setWordPopup] = useState<null | {
    word: string;
    definition?: string;
  }>(null);

  // ── Selection menu state ─────────────────────────────────────────────────────
  const [selectionMenu, setSelectionMenu] = useState<null | { text: string }>(null);

  // ── AI result ────────────────────────────────────────────────────────────────
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const readerRef = useRef<HTMLDivElement | null>(null);

  // ── Floating UI — word popup ──────────────────────────────────────────────────
  const {
    refs: wordRefs,
    floatingStyles: wordStyles,
  } = useFloating({
    open: !!wordPopup,
    placement: "top",
    middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // ── Floating UI — selection menu ──────────────────────────────────────────────
  const {
    refs: selRefs,
    floatingStyles: selStyles,
  } = useFloating({
    open: !!selectionMenu,
    placement: "top",
    middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // ── Client init: load persisted prefs & theme ────────────────────────────────
  useEffect(() => {
    setIsClient(true);
    const prefs = loadPrefs();
    setFontSize(prefs.fontSize);
    setLineHeight(prefs.lineHeight);
    setFontFamily(prefs.fontFamily);

    // Sync theme from localStorage / html attribute
    try {
      const storedTheme = window.localStorage.getItem("focusread-theme");
      setTheme(storedTheme === "light" ? "light" : "dark");
    } catch {
      setTheme("dark");
    }
  }, []);

  // ── Persist prefs whenever they change ──────────────────────────────────────
  useEffect(() => {
    if (!isClient) return;
    savePrefs({ fontSize, lineHeight, fontFamily });
  }, [fontSize, lineHeight, fontFamily, isClient]);

  // ── Theme toggler (mirrors theme-controller.tsx logic) ───────────────────────
  const handleToggleTheme = useCallback(() => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    try {
      document.documentElement.dataset.theme = next;
      document.documentElement.style.colorScheme = next;
      window.localStorage.setItem("focusread-theme", next);
    } catch {
      /* ignore */
    }
  }, [theme]);

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setWordPopup(null);
        setSelectionMenu(null);
        return;
      }
      if (!focusMode) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(paragraphs.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, paragraphs.length]);

  // ── Click-outside to dismiss popups ─────────────────────────────────────────
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // Stay open if click is inside a floating panel
      if (wordRefs.floating.current?.contains(target)) return;
      if (selRefs.floating.current?.contains(target)) return;
      setWordPopup(null);
      setSelectionMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [wordRefs.floating, selRefs.floating]);

  // ── Word click → dictionary lookup ──────────────────────────────────────────
  const handleWordClick = useCallback(async (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    wordRefs.setReference(makeVirtualEl(rect));
    setWordPopup({ word });

    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`
      );
      if (!res.ok) throw new Error("no def");
      const data = await res.json();
      const def = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
      setWordPopup((p) => (p ? { ...p, definition: def || "No definition found." } : p));
    } catch {
      setWordPopup((p) => (p ? { ...p, definition: "No definition found." } : p));
    }
  }, []);

  // ── Pronounce ────────────────────────────────────────────────────────────────
  const handlePronounce = useCallback((word: string) => {
    if (typeof window === "undefined") return;
    if ((window as typeof window & { speechSynthesis?: SpeechSynthesis }).speechSynthesis) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }, []);

  // ── Text selection → context menu ────────────────────────────────────────────
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (!sel) return;
    const text = sel.toString().trim();
    if (!text) {
      return;
    }
    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      selRefs.setReference(makeVirtualEl(rect));
      setSelectionMenu({ text });
    } catch {
      // ignore
    }
  }, [selRefs]);

  useEffect(() => {
    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, [handleMouseUp]);

  // ── AI call ──────────────────────────────────────────────────────────────────
  type AiAction = "Explain" | "Summarize" | "Translate";
  const AI_LABELS: Record<AiAction, string> = {
    Explain: "✨ Explanation",
    Summarize: "📋 Summary",
    Translate: "🌐 Translation",
  };

  const callAi = useCallback(async (action: AiAction, text: string) => {
    setAiLoading(true);
    setAiResult(null);
    setAiAction(AI_LABELS[action]);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text }),
      });
      const data = await res.json();
      setAiResult(data.result || data.error || "No response");
    } catch {
      setAiResult("Error calling AI. Please try again.");
    } finally {
      setAiLoading(false);
    }
    if (typeof window !== "undefined") {
      window.getSelection()?.removeAllRanges();
    }
    setSelectionMenu(null);
  }, []);

  // ── Computed font family string ────────────────────────────────────────────
  const fontFamilyValue =
    fontFamily === "reader" ? "var(--font-reader), serif" : "var(--font-body), sans-serif";

  return (
    <div className="min-h-screen relative" ref={readerRef}>
      {/* ── Top bar ─────────────────────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 h-[60px] z-40 flex items-center px-4"
        style={{
          background: "color-mix(in srgb, var(--app-surface) 88%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--app-border)",
        }}
      >
        <div className="flex w-full items-center justify-between max-w-4xl mx-auto">
          <div>
            <button
              onClick={() => router.push("/dashboard")}
              className="text-[14px] text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]"
            >
              ← Back
            </button>
          </div>

          <div className="text-center">
            <div className="text-[14px] text-[color:var(--app-muted)]">
              {chapter || "Chapter"} · Evening rituals
            </div>
            <div className="text-[16px] font-semibold text-[color:var(--app-text)]">{progress}%</div>
            <div className="mt-2 h-0.5 w-[120px] rounded-full overflow-hidden bg-[var(--app-surface-2)]">
              <div className="h-full bg-purple-600" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setFocusMode((s) => !s)}
              className={`px-3 py-1 rounded-lg border ${
                focusMode
                  ? "border-purple-500 text-purple-400"
                  : "border-[var(--app-border)] text-[color:var(--app-muted)]"
              }`}
            >
              Focus Mode
            </button>
            <button
              id="reader-settings-btn-top"
              onClick={() => setSettingsOpen(true)}
              className="text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] transition-colors"
              aria-label="Open reading settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      {/* ── Main reading area ───────────────────────────────────────────────── */}
      <div style={{ paddingTop: 80, paddingBottom: 100 }} className="px-4">
        <div className="mx-auto" style={{ maxWidth: 650 }}>
          <h1 className="text-[28px] font-semibold mb-2">{title}</h1>
          {author && (
            <div className="text-sm text-[color:var(--app-muted)] mb-6">{author}</div>
          )}

          <article className="m-0 space-y-10">
            {paragraphs.map((para, idx) => {
              const dimmed = focusMode && idx !== activeIndex;
              const isActive = focusMode && idx === activeIndex;

              return (
                <section
                  key={`${idx}`}
                  className="relative"
                  style={{
                    opacity: dimmed ? 0.18 : 1,
                    filter: dimmed ? "blur(2px)" : "none",
                    transition: "opacity 180ms ease, filter 180ms ease",
                  }}
                >
                  {isActive && (
                    <div
                      aria-hidden="true"
                      style={{
                        position: "absolute",
                        inset: "-8px",
                        pointerEvents: "none",
                        background:
                          "radial-gradient(600px 200px at 50% 40%, rgba(122,127,197,0.06), transparent 30%)",
                        borderRadius: 8,
                      }}
                    />
                  )}

                  <p
                    className="text-[20px]"
                    style={{
                      lineHeight,
                      marginBottom: 0,
                      color: "var(--app-text)",
                      letterSpacing: "0.02em",
                      fontFamily: fontFamilyValue,
                      fontSize,
                    }}
                  >
                    {para.split(/(\s+)/).map((token, i) => {
                      const isSpace = /\s+/.test(token);
                      if (isSpace) return token;
                      const clean = token.replace(/[^\w'-]/g, "");
                      return (
                        <span
                          key={`${idx}-${i}`}
                          className="inline"
                          onClick={(e) => handleWordClick(e, clean)}
                          style={{ cursor: "pointer" }}
                        >
                          {token}
                        </span>
                      );
                    })}
                  </p>

                  {isActive && (
                    <div className="mt-6 flex justify-between gap-4">
                      <div>
                        {idx > 0 && (
                          <button
                            onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}
                            className="rounded-md border border-white/10 px-3 py-2 text-white/90"
                          >
                            ← Previous
                          </button>
                        )}
                      </div>
                      <div>
                        {idx < paragraphs.length - 1 && (
                          <button
                            onClick={() =>
                              setActiveIndex((i) => Math.min(paragraphs.length - 1, i + 1))
                            }
                            className="rounded-md border border-white/10 px-3 py-2 text-white/90"
                          >
                            Next →
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </section>
              );
            })}
          </article>
        </div>
      </div>

      {/* ── Word popup — Floating UI ─────────────────────────────────────────── */}
      {wordPopup && (
        <FloatingPortal>
          <div
            ref={wordRefs.setFloating}
            style={{ ...wordStyles, zIndex: 60 }}
          >
            <div
              style={{
                background: "var(--app-surface)",
                border: "1px solid var(--app-border)",
                borderRadius: 12,
                padding: 14,
                width: 280,
                color: "var(--app-text)",
                boxShadow: "0 8px 32px var(--app-raise)",
              }}
            >
              <div style={{ fontWeight: 700, fontSize: 16 }}>{wordPopup.word}</div>
              <div style={{ fontSize: 14, color: "var(--app-muted)", marginTop: 6, minHeight: 20 }}>
                {wordPopup.definition ? (
                  wordPopup.definition
                ) : (
                  <span className="word-popup-skeleton" />
                )}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => handlePronounce(wordPopup.word)}
                  className="px-3 py-1 rounded-md border border-[var(--app-border)] text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-2)] transition-colors"
                >
                  🔊 Pronounce
                </button>
              </div>
            </div>
          </div>
        </FloatingPortal>
      )}

      {/* ── Selection menu — Floating UI ─────────────────────────────────────── */}
      {selectionMenu && (
        <FloatingPortal>
          <div
            ref={selRefs.setFloating}
            style={{ ...selStyles, zIndex: 60 }}
          >
            <div className="ai-selection-menu">
              <button
                onClick={() => callAi("Explain", selectionMenu.text)}
                className="ai-sel-btn"
              >
                ✨ Explain
              </button>
              <button
                onClick={() => callAi("Summarize", selectionMenu.text)}
                className="ai-sel-btn"
              >
                📋 Summarize
              </button>
              <button
                onClick={() => callAi("Translate", selectionMenu.text)}
                className="ai-sel-btn"
              >
                🌐 Translate
              </button>
            </div>
          </div>
        </FloatingPortal>
      )}

      {/* ── Bottom bar ──────────────────────────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 bottom-0 h-[70px] z-40 flex items-center justify-center"
        style={{
          background: "color-mix(in srgb, var(--app-surface) 94%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: "1px solid var(--app-border)",
        }}
      >
        <div className="flex items-center gap-3" style={{ width: 320, justifyContent: "center" }}>
          <button
            className="w-[80px] h-[56px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)]"
            onClick={() => {
              if (typeof window !== "undefined") window.speechSynthesis.cancel();
            }}
          >
            ⏸<span style={{ fontSize: 12 }}>Stop</span>
          </button>
          <button
            className="w-[80px] h-[56px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)]"
            onClick={() => {
              if (typeof window !== "undefined") {
                const sel = window.getSelection()?.toString().trim();
                if (sel) {
                  callAi("Explain", sel);
                } else {
                  setAiAction("✨ AI Assist");
                  setAiResult("Please highlight the text you want the AI to explain or summarize first.");
                }
              }
            }}
          >
            ✨<span style={{ fontSize: 12 }}>AI Assist</span>
          </button>
          <button
            id="reader-settings-btn-bottom"
            onClick={() => setSettingsOpen(true)}
            className="w-[80px] h-[56px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)]"
            aria-label="Open reading settings"
          >
            ⚙️<span style={{ fontSize: 12 }}>Settings</span>
          </button>
        </div>
      </div>

      {/* ── AI result bottom sheet ──────────────────────────────────────────── */}
      {(aiLoading || aiResult) && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 80, zIndex: 70 }}>
          <div className="mx-auto" style={{ maxWidth: 720, padding: "0 16px" }}>
            <div className="ai-result-sheet">
              {/* Header with label and close */}
              <div className="ai-result-header">
                <span className="ai-result-label">{aiAction || "AI"}</span>
                <button
                  onClick={() => {
                    setAiResult(null);
                    setAiLoading(false);
                    setAiAction(null);
                  }}
                  className="ai-result-close"
                  aria-label="Close AI result"
                >
                  ✕
                </button>
              </div>
              {/* Body — scrollable */}
              <div className="ai-result-body">
                {aiLoading ? (
                  <div className="ai-skeleton-wrapper">
                    <div className="ai-skeleton-line" style={{ width: "85%" }} />
                    <div className="ai-skeleton-line" style={{ width: "72%" }} />
                    <div className="ai-skeleton-line" style={{ width: "60%" }} />
                  </div>
                ) : (
                  <div className="ai-result-text">{aiResult}</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Settings modal ──────────────────────────────────────────────────── */}
      <ReaderSettings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        lineHeight={lineHeight}
        setLineHeight={setLineHeight}
        fontFamily={fontFamily}
        setFontFamily={setFontFamily}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}
