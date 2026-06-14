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
import { useBookStore } from "@/store/useBookStore";
import ReaderSettings, {
  type ReaderFont,
  loadPrefs,
  savePrefs,
} from "./ReaderSettings";

type Props = {
  slug: string;
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

export default function Reader({ slug, title, author, chapter, progress = 0, paragraphs }: Props) {
  const router = useRouter();
  const updateProgress = useBookStore((state) => state.updateProgress);

  // ── Focus mode ──────────────────────────────────────────────────────────────
  const [focusMode, setFocusMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);

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
    strategy: "fixed",
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
    strategy: "fixed",
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

  // ── Pagination and Resize Logic ──────────────────────────────────────────────
  const updatePagination = useCallback(() => {
    if (!contentRef.current) return;
    const el = contentRef.current;
    const colWidth = el.clientWidth;
    const gap = 40; // Matches CSS column-gap
    const total = Math.ceil((el.scrollWidth + gap) / (colWidth + gap));
    setTotalPages(Math.max(1, total));

    const current = Math.round(el.scrollLeft / (colWidth + gap)) + 1;
    setCurrentPage(current);
  }, []);

  useEffect(() => {
    const t = setTimeout(updatePagination, 150);
    window.addEventListener("resize", updatePagination);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", updatePagination);
    };
  }, [updatePagination, paragraphs, fontSize, lineHeight, fontFamily, focusMode]);

  const goToPage = useCallback((page: number) => {
    if (!contentRef.current) return;
    if (page < 1 || page > totalPages) return;
    const el = contentRef.current;
    const colWidth = el.clientWidth;
    const gap = 40;
    el.scrollTo({ left: (page - 1) * (colWidth + gap), behavior: "smooth" });
    setCurrentPage(page);

    const readingProgress = Math.round((page / totalPages) * 100);
    if (readingProgress > progress) {
      updateProgress(slug, Math.min(100, readingProgress));
    }
  }, [totalPages, progress, slug, updateProgress]);

  const prevPage = useCallback(() => goToPage(currentPage - 1), [goToPage, currentPage]);
  const nextPage = useCallback(() => goToPage(currentPage + 1), [goToPage, currentPage]);

  // ── Scroll Event Listener for Pagination ─────────────────────────────────────
  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const onScroll = () => {
      const colWidth = el.clientWidth;
      const gap = 40;
      const current = Math.round(el.scrollLeft / (colWidth + gap)) + 1;
      if (current !== currentPage) {
        setCurrentPage(current);
        const readingProgress = Math.round((current / totalPages) * 100);
        if (readingProgress > progress) {
          updateProgress(slug, Math.min(100, readingProgress));
        }
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [currentPage, totalPages, progress, slug, updateProgress]);

  // ── Keyboard navigation ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setWordPopup(null);
        setSelectionMenu(null);
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        if (focusMode) {
          setActiveIndex((i) => Math.min(paragraphs.length - 1, i + 1));
        } else {
          nextPage();
        }
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        if (focusMode) {
          setActiveIndex((i) => Math.max(0, i - 1));
        } else {
          prevPage();
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, paragraphs.length, prevPage, nextPage]);

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

  // ── Persist reading progress back to the shelf store (handled in pagination) ──

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
            <div className="text-[13px] font-medium text-[color:var(--app-text)] truncate max-w-[200px] sm:max-w-[300px]">
              {title || "Document"}
            </div>
            <div className="text-[12px] text-[color:var(--app-muted)]">
              Page {currentPage} of {totalPages}
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

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="fixed top-[60px] left-0 right-0 z-40 h-[3px] bg-[var(--app-surface-2)]">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300"
          style={{ width: `${Math.round((currentPage / totalPages) * 100)}%` }}
        />
      </div>

      {/* ── Main reading area (Paginated via CSS Columns) ───────────────────── */}
      <div 
        ref={contentRef}
        style={{ 
          paddingTop: 80, 
          paddingBottom: 100,
          height: "100vh",
          columnWidth: "calc(100vw - 40px)",
          columnGap: "40px",
          overflowX: "hidden",
          overflowY: "hidden",
          paddingLeft: "20px",
          paddingRight: "20px",
          boxSizing: "border-box"
        }} 
      >
        <div style={{ marginBottom: "2em", breakInside: "avoid" }}>
          <h1 className="text-[28px] font-semibold mb-2">{title}</h1>
          {author && (
            <div className="text-sm text-[color:var(--app-muted)] mb-6">{author}</div>
          )}
        </div>

        <article className="m-0 space-y-10" style={{ columnFill: "auto" }}>
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

      {/* ── Word popup — Floating UI ─────────────────────────────────────────── */}
      {wordPopup && (
        <FloatingPortal>
          <div
            ref={wordRefs.setFloating}
            style={{
              ...wordStyles,
              zIndex: 60,
              width: "min(280px, calc(100vw - 24px))",
            }}
          >
            <div
              style={{
                background: "var(--app-surface)",
                border: "1px solid var(--app-border)",
                borderRadius: 12,
                padding: 14,
                width: "100%",
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
            style={{
              ...selStyles,
              zIndex: 60,
              maxWidth: "calc(100vw - 24px)",
            }}
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
        <div className="flex items-center gap-4 w-full max-w-4xl justify-between px-6">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1}
            className="rounded-full border border-[var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-medium text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-2)] disabled:opacity-50 transition-colors"
          >
            ← Prev
          </button>

          <div className="flex items-center gap-3">
            <button
              className="w-[60px] h-[48px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)] transition-colors"
              onClick={() => {
                if (typeof window !== "undefined") window.speechSynthesis.cancel();
              }}
            >
              ⏸<span style={{ fontSize: 10 }}>Stop</span>
            </button>
            <button
              className="w-[60px] h-[48px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)] transition-colors"
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
              ✨<span style={{ fontSize: 10 }}>AI</span>
            </button>
            <button
              id="reader-settings-btn-bottom"
              onClick={() => setSettingsOpen(true)}
              className="w-[60px] h-[48px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)] transition-colors"
              aria-label="Open reading settings"
            >
              ⚙️<span style={{ fontSize: 10 }}>Settings</span>
            </button>
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages}
            className="rounded-full border border-[var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-medium text-[color:var(--app-text)] hover:bg-[color:var(--app-surface-2)] disabled:opacity-50 transition-colors"
          >
            Next →
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
