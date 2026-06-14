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
import * as pdfjsLib from "pdfjs-dist";
import { useBookStore, type Highlight } from "@/store/useBookStore";
import { getPdfBlob } from "@/lib/pdfStorage";

// Set up the PDF.js worker from CDN
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type Props = {
  slug: string;
};

function makeVirtualEl(rect: DOMRect): VirtualElement {
  return { getBoundingClientRect: () => rect };
}

export default function PdfReader({ slug }: Props) {
  const router = useRouter();
  const book = useBookStore((state) => state.books[slug]);
  const setCurrentPage = useBookStore((s) => s.setCurrentPage);
  const addHighlight = useBookStore((s) => s.addHighlight);
  const removeHighlight = useBookStore((s) => s.removeHighlight);
  const toggleBookmarkAction = useBookStore((s) => s.toggleBookmark);

  // ── PDF state ───────────────────────────────────────────────────────
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [pageNum, setPageNum] = useState(book?.currentPage || 1);
  const [totalPages, setTotalPages] = useState(book?.totalPages || 0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);
  const [pageTransition, setPageTransition] = useState(false);

  // ── Selection menu ──────────────────────────────────────────────────
  const [selectionMenu, setSelectionMenu] = useState<null | { text: string }>(null);

  // ── AI state ────────────────────────────────────────────────────────
  const [aiResult, setAiResult] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState<string | null>(null);

  // ── Refs ─────────────────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<any>(null);

  // ── Floating UI for selection menu ──────────────────────────────────
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

  // ── Computed values ─────────────────────────────────────────────────
  const highlights = book?.highlights || [];
  const bookmarks = book?.bookmarks || [];
  const isBookmarked = bookmarks.includes(pageNum);

  // ── Load PDF from IndexedDB ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadPdf() {
      setLoading(true);
      setError(null);
      try {
        const data = await getPdfBlob(slug);
        if (cancelled) return;
        if (!data) {
          setError("PDF file not found. It may have been deleted from browser storage.");
          setLoading(false);
          return;
        }

        const doc = await pdfjsLib.getDocument({ data }).promise;
        if (cancelled) return;

        setPdfDoc(doc);
        setTotalPages(doc.numPages);
        setLoading(false);
      } catch (err) {
        if (cancelled) return;
        console.error("Failed to load PDF:", err);
        setError("Failed to load PDF document.");
        setLoading(false);
      }
    }

    loadPdf();
    return () => { cancelled = true; };
  }, [slug]);

  // ── Render current page ─────────────────────────────────────────────
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

    let cancelled = false;

    async function renderPage() {
      if (!pdfDoc || !canvasRef.current || !textLayerRef.current) return;

      setRendering(true);

      // Cancel any ongoing render
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel(); } catch {}
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (cancelled) return;

        const canvas = canvasRef.current;
        const textLayerDiv = textLayerRef.current;

        // Calculate scale to fit container width
        const containerWidth = containerRef.current?.clientWidth || 800;
        const maxWidth = Math.min(containerWidth - 32, 800);
        const unscaledViewport = page.getViewport({ scale: 1 });
        const scale = (maxWidth / unscaledViewport.width) * window.devicePixelRatio;
        const viewport = page.getViewport({ scale });
        const displayViewport = page.getViewport({ scale: maxWidth / unscaledViewport.width });

        // Set canvas dimensions
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${displayViewport.width}px`;
        canvas.style.height = `${displayViewport.height}px`;

        // Render canvas
        const ctx = canvas.getContext("2d")!;
        const renderTask = page.render({ canvasContext: ctx, canvas, viewport });
        renderTaskRef.current = renderTask;
        await renderTask.promise;
        if (cancelled) return;

        // Clear and render text layer
        textLayerDiv.innerHTML = "";
        textLayerDiv.style.width = `${displayViewport.width}px`;
        textLayerDiv.style.height = `${displayViewport.height}px`;

        const textContent = await page.getTextContent();
        if (cancelled) return;

        // Render text layer using pdfjs
        const textLayerFragment = document.createDocumentFragment();
        const textDivs: HTMLElement[] = [];

        for (const item of textContent.items) {
          if (!("str" in item)) continue;
          const textItem = item as any;
          const tx = pdfjsLib.Util.transform(
            displayViewport.transform,
            textItem.transform
          );

          const div = document.createElement("span");
          div.textContent = textItem.str;
          div.style.position = "absolute";
          div.style.left = `${tx[4]}px`;
          div.style.top = `${tx[5]}px`;
          div.style.fontSize = `${Math.abs(tx[0])}px`;
          div.style.fontFamily = textItem.fontName || "sans-serif";
          div.style.transformOrigin = "0% 0%";
          // Adjust for PDF coordinate system (origin at bottom-left)
          const angle = Math.atan2(tx[1], tx[0]);
          if (Math.abs(angle) > 0.01) {
            div.style.transform = `rotate(${angle}rad)`;
          }
          div.style.whiteSpace = "pre";
          div.style.color = "transparent";
          div.style.lineHeight = "1";

          textDivs.push(div);
          textLayerFragment.appendChild(div);
        }

        textLayerDiv.appendChild(textLayerFragment);

        // Apply highlights to text layer
        applyHighlightsToTextLayer(textLayerDiv, pageNum);

        setRendering(false);
      } catch (err: any) {
        if (cancelled) return;
        if (err?.name !== "RenderingCancelledException") {
          console.error("Page render error:", err);
        }
        setRendering(false);
      }
    }

    renderPage();
    return () => { cancelled = true; };
  }, [pdfDoc, pageNum, highlights.length]);

  // ── Apply highlights ────────────────────────────────────────────────
  function applyHighlightsToTextLayer(container: HTMLDivElement, page: number) {
    const pageHighlights = highlights.filter((h) => h.pageNumber === page);
    if (pageHighlights.length === 0) return;

    const spans = container.querySelectorAll("span");
    spans.forEach((span) => {
      const text = span.textContent || "";
      for (const hl of pageHighlights) {
        if (text.includes(hl.text)) {
          span.style.backgroundColor = hl.color;
          span.style.color = "transparent";
          span.style.borderRadius = "2px";
          span.dataset.highlightId = hl.id;
        }
      }
    });
  }

  // ── Page navigation ─────────────────────────────────────────────────
  const goToPage = useCallback(
    (page: number) => {
      if (page < 1 || page > totalPages || rendering) return;
      setPageTransition(true);
      setTimeout(() => {
        setPageNum(page);
        setCurrentPage(slug, page);
        setSelectionMenu(null);
        setPageTransition(false);
      }, 150);
    },
    [totalPages, rendering, slug, setCurrentPage]
  );

  const prevPage = useCallback(() => goToPage(pageNum - 1), [goToPage, pageNum]);
  const nextPage = useCallback(() => goToPage(pageNum + 1), [goToPage, pageNum]);

  // ── Keyboard navigation ─────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSelectionMenu(null);
        return;
      }
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
    return () => window.removeEventListener("keydown", onKey);
  }, [prevPage, nextPage]);

  // ── Text selection → context menu ────────────────────────────────────
  useEffect(() => {
    const onMouseUp = () => {
      if (typeof window === "undefined") return;
      const sel = window.getSelection();
      if (!sel) return;
      const text = sel.toString().trim();
      if (!text) return;
      try {
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        selRefs.setReference(makeVirtualEl(rect));
        setSelectionMenu({ text });
      } catch {
        // ignore
      }
    };

    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [selRefs]);

  // ── Click-outside to dismiss ────────────────────────────────────────
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (selRefs.floating.current?.contains(target)) return;
      setSelectionMenu(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [selRefs.floating]);

  // ── AI call ──────────────────────────────────────────────────────────
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

  // ── Highlight handler ────────────────────────────────────────────────
  const handleHighlight = useCallback(
    (text: string) => {
      const highlight: Highlight = {
        id: crypto.randomUUID(),
        pageNumber: pageNum,
        text,
        color: "rgba(250, 204, 21, 0.35)",
        createdAt: Date.now(),
      };
      addHighlight(slug, highlight);
      window.getSelection()?.removeAllRanges();
      setSelectionMenu(null);
    },
    [pageNum, slug, addHighlight]
  );

  // ── Bookmark toggle ─────────────────────────────────────────────────
  const handleToggleBookmark = useCallback(() => {
    toggleBookmarkAction(slug, pageNum);
  }, [slug, pageNum, toggleBookmarkAction]);

  // ── Progress ────────────────────────────────────────────────────────
  const progress = totalPages > 0 ? Math.round((pageNum / totalPages) * 100) : 0;

  // ── Error state ─────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <div className="text-5xl mb-4">📄</div>
          <h2 className="text-xl font-semibold text-[color:var(--app-text)] mb-2">
            Unable to load document
          </h2>
          <p className="text-sm text-[color:var(--app-muted)] mb-6">{error}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="rounded-full border border-[var(--app-border)] bg-[color:var(--app-text)] px-5 py-2.5 text-sm font-semibold text-[color:var(--app-bg)] transition-colors hover:bg-transparent hover:text-[color:var(--app-text)]"
          >
            Back to shelf
          </button>
        </div>
      </div>
    );
  }

  // ── Loading state ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="pdf-loading-spinner" />
          <p className="mt-4 text-sm text-[color:var(--app-muted)]">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative" ref={containerRef}>
      {/* ── Top bar ──────────────────────────────────────────────────── */}
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
          <button
            onClick={() => router.push("/dashboard")}
            className="text-[14px] text-[color:var(--app-muted)] hover:text-[color:var(--app-text)] transition-colors"
          >
            ← Back
          </button>

          <div className="text-center">
            <div className="text-[13px] font-medium text-[color:var(--app-text)] truncate max-w-[200px] sm:max-w-[300px]">
              {book?.title || "Document"}
            </div>
            <div className="text-[12px] text-[color:var(--app-muted)]">
              Page {pageNum} of {totalPages}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleBookmark}
              className={`p-2 rounded-lg border transition-all duration-200 ${
                isBookmarked
                  ? "border-amber-500/50 bg-amber-500/10 text-amber-400"
                  : "border-[var(--app-border)] text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]"
              }`}
              aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
            >
              {isBookmarked ? "🔖" : "📑"}
            </button>
          </div>
        </div>
      </div>

      {/* ── Progress bar ─────────────────────────────────────────────── */}
      <div className="fixed top-[60px] left-0 right-0 z-40 h-[3px] bg-[var(--app-surface-2)]">
        <div
          className="h-full bg-gradient-to-r from-purple-600 to-indigo-500 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* ── Page container ───────────────────────────────────────────── */}
      <div className="pdf-page-area" style={{ paddingTop: 80, paddingBottom: 100 }}>
        <div
          className={`pdf-page-wrapper ${pageTransition ? "pdf-page-transitioning" : ""}`}
        >
          {rendering && (
            <div className="pdf-page-loading-overlay">
              <div className="pdf-loading-spinner-small" />
            </div>
          )}
          <canvas ref={canvasRef} className="pdf-canvas" />
          <div
            ref={textLayerRef}
            className="pdf-text-layer"
          />
        </div>
      </div>

      {/* ── Selection menu — Floating UI ───────────────────────────── */}
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
              <button
                onClick={() => handleHighlight(selectionMenu.text)}
                className="ai-sel-btn"
                style={{ borderColor: "rgba(250,204,21,0.4)" }}
              >
                🖍 Highlight
              </button>
            </div>
          </div>
        </FloatingPortal>
      )}

      {/* ── Bottom bar ───────────────────────────────────────────────── */}
      <div
        className="fixed left-0 right-0 bottom-0 z-40 flex items-center justify-center"
        style={{
          height: 70,
          background: "color-mix(in srgb, var(--app-surface) 94%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderTop: "1px solid var(--app-border)",
        }}
      >
        <div className="flex items-center gap-4 w-full max-w-lg justify-between px-6">
          <button
            onClick={prevPage}
            disabled={pageNum <= 1}
            className="pdf-nav-btn"
          >
            ← Prev
          </button>

          <div className="text-center">
            <span className="text-[13px] font-semibold text-[color:var(--app-text)]">
              {pageNum}
            </span>
            <span className="text-[13px] text-[color:var(--app-muted)]">
              {" "}/ {totalPages}
            </span>
          </div>

          <button
            onClick={nextPage}
            disabled={pageNum >= totalPages}
            className="pdf-nav-btn"
          >
            Next →
          </button>
        </div>
      </div>

      {/* ── AI result bottom sheet ────────────────────────────────────── */}
      {(aiLoading || aiResult) && (
        <div style={{ position: "fixed", left: 0, right: 0, bottom: 80, zIndex: 70 }}>
          <div className="mx-auto" style={{ maxWidth: 720, padding: "0 16px" }}>
            <div className="ai-result-sheet">
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
    </div>
  );
}
