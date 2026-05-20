"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  title: string;
  author?: string;
  chapter?: string;
  progress?: number;
  paragraphs: string[];
};

export default function Reader({ title, author, chapter, progress = 0, paragraphs }: Props) {
  const router = useRouter();
  const [focusMode, setFocusMode] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [wordPopup, setWordPopup] = useState<null | {
    word: string;
    definition?: string;
    left: number;
    top: number;
    placeBelow?: boolean;
  }>(null);
  const [selectionMenu, setSelectionMenu] = useState<null | { left: number; top: number; placeBelow: boolean; text: string }>(null);
  const [aiResult, setAiResult] = useState<string | null>(null);
  const readerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<HTMLDivElement | null>(null);
  const selectionRef = useRef<HTMLDivElement | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [fontSize, setFontSize] = useState(22);

  // client-only init
  useEffect(() => {
    setIsClient(true);
    const onResize = () => {
      const w = window.innerWidth;
      setFontSize(w < 640 ? 18 : w < 1024 ? 20 : 22);
    };
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!focusMode) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(paragraphs.length - 1, i + 1));
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
      }
      if (e.key === "Escape") {
        setWordPopup(null);
        setSelectionMenu(null);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [focusMode, paragraphs.length]);

  // click outside to dismiss popup/selection
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      // if clicked inside popup or selection menu, do nothing
      if (popupRef.current && popupRef.current.contains(target)) return;
      if (selectionRef.current && selectionRef.current.contains(target)) return;
      if (readerRef.current && readerRef.current.contains(target)) return;
      // otherwise dismiss
      setWordPopup(null);
      setSelectionMenu(null);
    };
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  const handleWordClick = useCallback(async (e: React.MouseEvent, word: string) => {
    e.preventDefault();
    e.stopPropagation();
    const el = e.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    // decide place above or below depending on space
    const placeBelow = rect.top < 140;
    setWordPopup({ word, left: rect.left + rect.width / 2, top: placeBelow ? rect.bottom : rect.top, placeBelow });

    try {
      const res = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`);
      if (!res.ok) throw new Error("no def");
      const data = await res.json();
      const def = data?.[0]?.meanings?.[0]?.definitions?.[0]?.definition;
      setWordPopup((p) => (p ? { ...p, definition: def || "No definition found." } : p));
    } catch (err) {
      setWordPopup((p) => (p ? { ...p, definition: "No definition found." } : p));
    }
  }, []);

  const handlePronounce = useCallback((word: string) => {
    if (typeof window === "undefined") return;
    if ((window as any).speechSynthesis) {
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    }
  }, []);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (!sel) return;
    const text = sel.toString().trim();
    if (!text) {
      setSelectionMenu(null);
      return;
    }
    try {
      const range = sel.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      // choose placement
      const placeBelow = rect.top < 140;
      setSelectionMenu({ left: rect.left + rect.width / 2, top: placeBelow ? rect.bottom : rect.top, placeBelow, text });
    } catch (err) {
      // ignore
    }
  }, []);

  const callAi = useCallback(async (action: "Explain" | "Summarize" | "Translate", text: string) => {
    setAiResult("Loading...");
    try {
      const res = await fetch("/api/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, text }) });
      const data = await res.json();
      const result = data.result || data.error || "No response";
      setAiResult(result);
    } catch (err) {
      setAiResult("Error calling AI");
    }
    // collapse selection
    if (typeof window !== "undefined") {
      const sel = window.getSelection();
      sel?.removeAllRanges();
    }
    setSelectionMenu(null);
  }, []);

  const handleSimplify = useCallback((word: string) => {
    // Ask AI to "Explain" the single word
    callAi("Explain", word);
    setWordPopup(null);
  }, [callAi]);

  return (
    <div className="min-h-screen relative" ref={readerRef}>
      {/* Top bar */}
      <div className="fixed top-0 left-0 right-0 h-[60px] z-40 flex items-center px-4" style={{ background: "color-mix(in srgb, var(--app-surface) 88%, transparent)", backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)", borderBottom: "1px solid var(--app-border)" }}>
        <div className="flex w-full items-center justify-between max-w-4xl mx-auto">
          <div>
            <button onClick={() => router.push("/dashboard")} className="text-[14px] text-[color:var(--app-muted)] hover:text-[color:var(--app-text)]">
              ← Back
            </button>
          </div>

          <div className="text-center">
            <div className="text-[14px] text-[color:var(--app-muted)]">{chapter || "Chapter"} · Evening rituals</div>
            <div className="text-[16px] font-semibold text-[color:var(--app-text)]">{progress}%</div>
            <div className="mt-2 h-0.5 w-[120px] rounded-full overflow-hidden bg-[var(--app-surface-2)]">
              <div className="h-full bg-purple-600" style={{ width: `${progress}%` }} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setFocusMode((s) => !s)} className={`px-3 py-1 rounded-lg border ${focusMode ? "border-purple-500 text-purple-400" : "border-[var(--app-border)] text-[color:var(--app-muted)]"}`}>
              Focus Mode
            </button>
            <button onClick={() => alert("Settings panel placeholder")} className="text-[color:var(--app-muted)]">⚙️</button>
          </div>
        </div>
      </div>

      {/* Main reading area */}
      <div style={{ paddingTop: 80, paddingBottom: 100 }} className="px-4">
        <div className="mx-auto" style={{ maxWidth: 650 }} onMouseUp={handleMouseUp}>
          <h1 className="text-[28px] font-semibold mb-2">{title}</h1>
          {author && <div className="text-sm text-[color:var(--app-muted)] mb-6">{author}</div>}

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
                      lineHeight: 2,
                      marginBottom: 0,
                      color: "var(--app-text)",
                      letterSpacing: "0.02em",
                      fontFamily: "var(--font-reader)",
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
                            onClick={() => setActiveIndex((i) => Math.min(paragraphs.length - 1, i + 1))}
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

      {/* Word popup */}
      {wordPopup && (
        <div ref={popupRef} style={{ position: 'fixed', left: wordPopup.left, top: wordPopup.placeBelow ? wordPopup.top + 8 : wordPopup.top - 8, transform: 'translateX(-50%)', zIndex: 60 }}>
          <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', borderRadius: 12, padding: 12, width: 280, color: 'var(--app-text)' }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{wordPopup.word}</div>
            <div style={{ fontSize: 14, color: 'var(--app-muted)', marginTop: 6 }}>{wordPopup.definition || 'Loading...'}</div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => handleSimplify(wordPopup.word)} className="px-3 py-1 rounded-md border border-[var(--app-border)] text-[color:var(--app-text)]">Simplify</button>
              <button onClick={() => handlePronounce(wordPopup.word)} className="px-3 py-1 rounded-md border border-[var(--app-border)] text-[color:var(--app-text)]">Pronounce</button>
            </div>
          </div>
        </div>
      )}

      {/* Selection menu */}
      {selectionMenu && (
        <div ref={selectionRef} style={{ position: 'fixed', left: selectionMenu.left, top: selectionMenu.placeBelow ? selectionMenu.top + 8 : selectionMenu.top - 44, transform: 'translateX(-50%)', zIndex: 60 }}>
          <div style={{ display: 'flex', gap: 8, background: 'transparent' }}>
            <button onClick={() => callAi('Explain', selectionMenu.text)} className="px-3 py-2 rounded-full border border-[var(--app-border)] text-[color:var(--app-text)] bg-[color:var(--app-surface)]">Explain</button>
            <button onClick={() => callAi('Summarize', selectionMenu.text)} className="px-3 py-2 rounded-full border border-[var(--app-border)] text-[color:var(--app-text)] bg-[color:var(--app-surface)]">Summarize</button>
            <button onClick={() => callAi('Translate', selectionMenu.text)} className="px-3 py-2 rounded-full border border-[var(--app-border)] text-[color:var(--app-text)] bg-[color:var(--app-surface)]">Translate</button>
          </div>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed left-0 right-0 bottom-0 h-[70px] z-40 flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--app-surface) 94%, transparent)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderTop: '1px solid var(--app-border)' }}>
        <div className="flex items-center gap-3" style={{ width: 320, justifyContent: 'center' }}>
          <button className="w-[80px] h-[56px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)]" onClick={() => { if (typeof window !== 'undefined') window.speechSynthesis.cancel(); }}>⏸<span style={{ fontSize: 12 }}>Stop</span></button>
          <button className="w-[80px] h-[56px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)]" onClick={() => setAiResult("AI Assist placeholder")}>✨<span style={{ fontSize: 12 }}>AI Assist</span></button>
          <button onClick={() => alert('Settings placeholder')} className="w-[80px] h-[56px] rounded-lg border border-[var(--app-border)] text-[color:var(--app-muted)] flex flex-col items-center justify-center gap-1 hover:bg-[color:var(--app-surface-2)]">⚙️<span style={{ fontSize: 12 }}>Settings</span></button>
        </div>
      </div>

      {/* AI result bottom sheet */}
      {aiResult && (
        <div style={{ position: 'fixed', left: 0, right: 0, bottom: 80, zIndex: 70 }}>
          <div className="mx-auto" style={{ maxWidth: 720 }}>
            <div style={{ background: 'var(--app-surface)', border: '1px solid var(--app-border)', padding: 12, borderRadius: 12, color: 'var(--app-text)' }}>
              <div className="flex justify-between items-start">
                <div>{aiResult}</div>
                <button onClick={() => setAiResult(null)} className="ml-4 text-[color:var(--app-muted)]">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
