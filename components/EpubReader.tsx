"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ePub, { Book as EpubBook, Rendition } from "epubjs";
import { useBookStore, type Highlight } from "@/store/useBookStore";
import { getPdfBlob } from "@/lib/pdfStorage";
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

function makeVirtualEl(rect: DOMRect): VirtualElement {
  return {
    getBoundingClientRect: () => rect,
  };
}

export default function EpubReader({ slug }: { slug: string }) {
  const router = useRouter();
  const book = useBookStore((state) => state.books[slug]);
  const updateProgress = useBookStore((state) => state.updateProgress);
  const addHighlight = useBookStore((state) => state.addHighlight);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [epubBook, setEpubBook] = useState<EpubBook | null>(null);
  const [rendition, setRendition] = useState<Rendition | null>(null);
  
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const viewerRef = useRef<HTMLDivElement>(null);
  const initialHighlightsRef = useRef(book?.highlights);

  // ── AI states ────────────────────────────────────────────────────────────────
  type AiAction = "Explain" | "Summarize" | "Translate";
  const AI_LABELS: Record<AiAction, string> = {
    Explain: "✨ Explanation",
    Summarize: "📋 Summary",
    Translate: "🌐 Translation",
  };

  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string | null>(null);

  // Floating AI popup (Explain & Translate for selection)
  const [floatingAiResult, setFloatingAiResult] = useState<string | null>(null);
  const [floatingAiLoading, setFloatingAiLoading] = useState(false);
  const [floatingAiAction, setFloatingAiAction] = useState<string | null>(null);

  const {
    refs: floatingAiRefs,
    floatingStyles: floatingAiStyles,
  } = useFloating({
    open: floatingAiLoading || !!floatingAiResult,
    strategy: "fixed",
    placement: "top",
    middleware: [offset(10), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });

  // Selection Menu
  const [selectionMenu, setSelectionMenu] = useState<{
    cfiRange: string;
    text: string;
    rect: DOMRect;
    clearSelection: () => void;
  } | null>(null);

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
  

  // ── Settings & Theme ─────────────────────────────────────────────────────────
  const [fontSize, setFontSize] = useState(20);
  const [lineHeight, setLineHeight] = useState(2.0);
  const [fontFamily, setFontFamily] = useState<ReaderFont>("reader");
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const prefs = loadPrefs();
    setFontSize(prefs.fontSize);
    setLineHeight(prefs.lineHeight);
    setFontFamily(prefs.fontFamily);

    try {
      const storedTheme = window.localStorage.getItem("focusread-theme");
      setTheme(storedTheme === "light" ? "light" : "dark");
    } catch {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    if (!isClient) return;
    savePrefs({ fontSize, lineHeight, fontFamily });
  }, [fontSize, lineHeight, fontFamily, isClient]);

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

  // Sync settings to epub.js
  useEffect(() => {
    if (!rendition) return;
    rendition.themes.select(theme);
    rendition.themes.fontSize(`${fontSize}px`);
  }, [rendition, theme, fontSize]);


  const callFloatingAi = useCallback(async (action: AiAction, text: string) => {
    setFloatingAiLoading(true);
    setFloatingAiResult(null);
    setFloatingAiAction(AI_LABELS[action]);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, text }),
      });
      const data = await res.json();
      setFloatingAiResult(data.result || data.error || "No response");
    } catch {
      setFloatingAiResult("Error calling AI. Please try again.");
    } finally {
      setFloatingAiLoading(false);
    }
  }, []);

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
  }, []);

  const getCurrentSectionText = useCallback(() => {
    if (!rendition) return "";
    const contents = rendition.getContents() as unknown as any[];
    let text = "";
    contents.forEach((c: any) => {
      if (c.document && c.document.body) {
        text += c.document.body.textContent || "";
      }
    });
    return text.replace(/\s+/g, " ").trim();
  }, [rendition]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (selRefs.floating.current?.contains(target)) return;
      if (floatingAiRefs.floating.current?.contains(target)) return;
      
      setFloatingAiResult(null);
      setFloatingAiLoading(false);
      setFloatingAiAction(null);

      setSelectionMenu((prev) => {
        if (prev) prev.clearSelection();
        return null;
      });
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [selRefs.floating, floatingAiRefs.floating]);

  useEffect(() => {
    let cancelled = false;

    async function loadBook() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPdfBlob(slug);
        if (cancelled) return;
        if (!data) {
          setError("EPUB file not found.");
          setLoading(false);
          return;
        }

        const newBook = ePub(data);
        setEpubBook(newBook);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        setError("Failed to load EPUB.");
        setLoading(false);
      }
    }

    loadBook();
    return () => { cancelled = true; };
  }, [slug]);

  useEffect(() => {
    if (!epubBook || !viewerRef.current) return;

    const newRendition = epubBook.renderTo(viewerRef.current, {
      manager: "default",
      flow: "paginated",
      spread: "none",
      width: "100%",
      height: "100%"
    });

    setRendition(newRendition);

    newRendition.display();

    // Register Themes
    newRendition.themes.register("dark", {
      "body": {
        "background": "#111118 !important",
        "color": "#f8f8f2 !important",
      },
      "p, div, span": {
        "color": "#f8f8f2 !important",
      },
      "a": {
        "color": "#a855f7 !important"
      },
      "h1, h2, h3, h4, h5, h6": {
        "color": "#c084fc !important"
      }
    });

    newRendition.themes.register("light", {
      "body": {
        "background": "#fdfdfc !important",
        "color": "#111118 !important",
      },
      "p, div, span": {
        "color": "#111118 !important",
      },
      "a": {
        "color": "#7e22ce !important"
      },
      "h1, h2, h3, h4, h5, h6": {
        "color": "#6b21a8 !important"
      }
    });

    // Apply current theme on init
    newRendition.themes.select(theme);
    newRendition.themes.fontSize(`${fontSize}px`);

    // Restore existing highlights
    if (initialHighlightsRef.current) {
      initialHighlightsRef.current.forEach((h) => {
        if (h.cfi) {
          try {
            newRendition.annotations.highlight(h.cfi, {}, (e: any) => {
              console.log("Clicked highlight", h.id);
            });
          } catch (err) {
            console.warn("Failed to restore highlight", h.cfi);
          }
        }
      });
    }

    // Close popups when clicking anywhere in the epub iframe
    newRendition.on("mousedown", () => {
      setFloatingAiResult(null);
      setFloatingAiLoading(false);
      setFloatingAiAction(null);
      setSelectionMenu((prev) => {
        if (prev) prev.clearSelection();
        return null;
      });
    });

    newRendition.on("selected", (cfiRange: string, contents: any) => {
      try {
        // Clear previous floating popup when making a new selection
        setFloatingAiResult(null);
        setFloatingAiLoading(false);
        setFloatingAiAction(null);

        const selection = contents.window.getSelection();
        const text = selection ? selection.toString().trim() : "";

        if (text) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          const iframe = contents.document.defaultView.frameElement;
          const iframeRect = iframe.getBoundingClientRect();
          
          const adjustedRect = {
             top: rect.top + iframeRect.top,
             left: rect.left + iframeRect.left,
             right: rect.right + iframeRect.left,
             bottom: rect.bottom + iframeRect.top,
             width: rect.width,
             height: rect.height
          } as DOMRect;
          
          selRefs.setReference(makeVirtualEl(adjustedRect));
          setSelectionMenu({
            cfiRange,
            text,
            rect: adjustedRect,
            clearSelection: () => {
              if (selection) selection.removeAllRanges();
            }
          });
        }
      } catch (err) {
        console.error("Failed to capture selection", err);
      }
    });

    epubBook.ready.then(() => {
      return epubBook.locations.generate(1600);
    }).then(() => {
       // Locations generated
    });

    newRendition.on("relocated", (location: any) => {
      setAtStart(location.atStart);
      setAtEnd(location.atEnd);

      if (epubBook.locations.length() > 0) {
        const progressPercentage = epubBook.locations.percentageFromCfi(location.start.cfi);
        const progressNum = Math.round(progressPercentage * 100);
        updateProgress(slug, progressNum);
      }
    });

    return () => {
      newRendition.destroy();
    };
  }, [epubBook, slug, updateProgress, addHighlight, selRefs]);

  const prevPage = useCallback(() => {
    if (rendition) rendition.prev();
  }, [rendition]);

  const nextPage = useCallback(() => {
    if (rendition) rendition.next();
  }, [rendition]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        prevPage();
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        nextPage();
      }
    };
    window.addEventListener("keydown", onKey);
    
    const onRenditionKey = (e: any) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") prevPage();
      if (e.key === "ArrowRight" || e.key === "ArrowDown") nextPage();
    };

    if (rendition) {
      rendition.on("keyup", onRenditionKey);
    }
    return () => {
      window.removeEventListener("keydown", onKey);
      if (rendition) rendition.off("keyup", onRenditionKey);
    };
  }, [prevPage, nextPage, rendition]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-xl font-semibold mb-2">Unable to load document</h2>
          <p className="text-sm mb-6">{error}</p>
          <button onClick={() => router.push("/dashboard")} className="rounded-full border px-5 py-2.5">Back to shelf</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col">
      <div className="fixed top-0 left-0 right-0 h-[60px] z-40 flex items-center px-4 border-b border-[var(--app-border)]" style={{ background: "color-mix(in srgb, var(--app-surface) 88%, transparent)", backdropFilter: "blur(8px)" }}>
        <div className="flex w-full items-center justify-between max-w-4xl mx-auto">
          <button onClick={() => router.push("/dashboard")} className="text-sm text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] transition-colors">← Back</button>
          <div className="text-center">
            <div className="text-[13px] font-medium text-[color:var(--app-text)] truncate max-w-[200px] sm:max-w-[300px]">{book?.title || "Document"}</div>
            <div className="text-[12px] text-[color:var(--app-muted)]">{book?.progress || 0}% completed</div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSettingsOpen(true)}
              className="text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] transition-colors"
              aria-label="Open reading settings"
            >
              ⚙️
            </button>
          </div>
        </div>
      </div>

      <div className="fixed top-[60px] left-0 right-0 z-40 h-[3px] bg-[var(--app-surface-2)]">
        <div className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300" style={{ width: `${book?.progress || 0}%` }} />
      </div>

      <div className="flex-1 w-full flex items-center justify-center pt-[80px] pb-[90px]">
        <div className="w-full h-full max-w-4xl mx-auto px-4" style={{ height: "calc(100vh - 170px)" }}>
          <div ref={viewerRef} className="w-full h-full overflow-hidden" />
        </div>
      </div>

      <div className="fixed left-0 right-0 bottom-0 h-[70px] z-40 flex items-center justify-center border-t border-[var(--app-border)]" style={{ background: "color-mix(in srgb, var(--app-surface) 94%, transparent)", backdropFilter: "blur(8px)" }}>
        <div className="flex items-center gap-4 w-full max-w-4xl justify-between px-6">
          <button onClick={prevPage} disabled={atStart} className="rounded-full border border-[var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--app-surface-2)] disabled:opacity-50 transition-colors">← Prev</button>
          
          <div className="flex items-center gap-2">
            <button
              className="w-[100px] h-[40px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)] transition-colors"
              onClick={() => {
                const text = getCurrentSectionText();
                if (text) callAi("Summarize", text);
              }}
            >
              <span style={{ fontSize: 13 }}>📋 Summarize</span>
            </button>
            <button
              className="w-[100px] h-[40px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)] transition-colors"
              onClick={() => {
                const text = getCurrentSectionText();
                if (text) callAi("Translate", text);
              }}
            >
              <span style={{ fontSize: 13 }}>🌐 Translate</span>
            </button>
          </div>

          <button onClick={nextPage} disabled={atEnd} className="rounded-full border border-[var(--app-border)] bg-[color:var(--app-surface)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--app-surface-2)] disabled:opacity-50 transition-colors">Next →</button>
        </div>
      </div>

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
                onClick={() => {
                  floatingAiRefs.setReference(makeVirtualEl(selectionMenu.rect));
                  callFloatingAi("Explain", selectionMenu.text);
                  selectionMenu.clearSelection();
                  setSelectionMenu(null);
                }}
                className="ai-sel-btn"
              >
                ✨ Explain
              </button>
              <button
                onClick={() => {
                  floatingAiRefs.setReference(makeVirtualEl(selectionMenu.rect));
                  callFloatingAi("Translate", selectionMenu.text);
                  selectionMenu.clearSelection();
                  setSelectionMenu(null);
                }}
                className="ai-sel-btn"
              >
                🌐 Translate
              </button>
              <button
                onClick={() => {
                  if (rendition) {
                    try {
                      rendition.annotations.highlight(selectionMenu.cfiRange, {}, (e: any) => {
                        console.log("Clicked highlight");
                      });
                      const newHighlight: Highlight = {
                        id: Math.random().toString(36).substring(2, 9),
                        pageNumber: 1,
                        text: selectionMenu.text,
                        color: "rgba(255, 255, 0, 0.3)",
                        createdAt: Date.now(),
                        cfi: selectionMenu.cfiRange,
                      };
                      addHighlight(slug, newHighlight);
                    } catch (err) {
                      console.error("Failed to add highlight", err);
                    }
                  }
                  selectionMenu.clearSelection();
                  setSelectionMenu(null);
                }}
                className="ai-sel-btn border-l border-[var(--app-border)]"
              >
                🖍️ Highlight
              </button>
            </div>
          </div>
        </FloatingPortal>
      )}

      {/* ── Floating AI popup (Explain & Translate) ─────────────────────────── */}
      {(floatingAiLoading || floatingAiResult) && (
        <FloatingPortal>
          <div
            ref={floatingAiRefs.setFloating}
            style={{
              ...floatingAiStyles,
              zIndex: 60,
              width: "min(320px, calc(100vw - 24px))",
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
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--app-muted)" }}>
                  {floatingAiAction || "✨ AI Result"}
                </div>
                <button
                  onClick={() => {
                    setFloatingAiResult(null);
                    setFloatingAiLoading(false);
                    setFloatingAiAction(null);
                  }}
                  className="text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] transition-colors p-1"
                  aria-label="Close AI popup"
                >
                  ✕
                </button>
              </div>
              <div style={{ fontSize: 14, color: "var(--app-text)", minHeight: 20 }}>
                {floatingAiLoading ? (
                  <div className="ai-skeleton-wrapper">
                    <div className="ai-skeleton-line" style={{ width: "85%" }} />
                    <div className="ai-skeleton-line" style={{ width: "60%" }} />
                  </div>
                ) : (
                  floatingAiResult
                )}
              </div>
            </div>
          </div>
        </FloatingPortal>
      )}

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
