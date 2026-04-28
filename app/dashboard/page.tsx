"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type SelectionMenu = {
  text: string;
  x: number;
  y: number;
  placeAbove: boolean;
};

type DictionaryEntry = {
  senses?: Array<{
    definition?: string;
    subsenses?: Array<{
      definition?: string;
    }>;
  }>;
};

type DictionaryApiResponse =
  | {
      word?: string;
      entries?: DictionaryEntry[];
    }
  | DictionaryEntry[];

type ReaderAction = "Explain" | "Summarize";

const READING_PARAGRAPHS = [
  "Most people do not need more motivation. They need less friction. A good reading habit starts by making the next page easier to open than your favorite distraction app.",
  "Attention is not a switch. It is a spotlight that drifts. When you notice your mind wander, you do not fail. You simply return the light to the line and continue.",
  "Ideas become useful when they are rehearsed in your own language. Pause after each section and ask: what changed in the way I think, decide, or act?",
  "Small sessions stack. Twelve focused minutes every day can outperform a single long session done once a week, because memory strengthens through repeated retrieval.",
  "Reading deeply is not speed. It is contact. Stay long enough with one paragraph to feel the argument tighten, then move only when the meaning feels stable.",
];

const WORD_DEFINITIONS: Record<string, string> = {
  friction:
    "Anything that makes starting or continuing a task harder than it needs to be.",
  spotlight:
    "A narrow center of attention that emphasizes one thing at a time.",
  retrieval:
    "The act of recalling information from memory to strengthen learning.",
  stable: "Clear and settled enough that your understanding does not wobble.",
};

export default function DashboardPage() {
  const [focusMode, setFocusMode] = useState(false);
  const [activeParagraph, setActiveParagraph] = useState(1);
  const [wordPopup, setWordPopup] = useState<SelectionMenu | null>(null);
  const [selectionMenu, setSelectionMenu] = useState<SelectionMenu | null>(
    null,
  );
  const [assistantPopup, setAssistantPopup] = useState<{
    title: ReaderAction;
    text: string;
    x: number;
    y: number;
    placeAbove: boolean;
    retryable: boolean;
    sourceText: string;
  } | null>(null);
  const [loadingAction, setLoadingAction] = useState<ReaderAction | null>(null);
  const [loadingInfo, setLoadingInfo] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const readingContainerRef = useRef<HTMLDivElement | null>(null);
  const definitionCacheRef = useRef<Record<string, string>>({});
  const definitionRequestIdRef = useRef(0);
  const loadingInfoTimerRef = useRef<number | null>(null);

  const getFloatingPosition = useCallback((rect: DOMRect) => {
    const sidePadding = 24;
    const x = Math.min(
      window.innerWidth - sidePadding,
      Math.max(sidePadding, rect.left + rect.width / 2),
    );
    const placeAbove = rect.top > 220;
    const y = placeAbove ? rect.top - 12 : rect.bottom + 12;

    return { x, y, placeAbove };
  }, []);

  const progressValue = useMemo(() => {
    const total = READING_PARAGRAPHS.length;
    return Math.round(((activeParagraph + 1) / total) * 100);
  }, [activeParagraph]);

  const stopSpeech = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  const playSpeech = useCallback(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      return;
    }

    const sourceText =
      selectionMenu?.text || READING_PARAGRAPHS[activeParagraph];
    stopSpeech();
    const utterance = new SpeechSynthesisUtterance(sourceText);
    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [activeParagraph, selectionMenu?.text, stopSpeech]);

  const dismissMenus = useCallback(() => {
    setWordPopup(null);
    setSelectionMenu(null);
    setAssistantPopup(null);
    setLoadingInfo(null);
    if (loadingInfoTimerRef.current !== null) {
      window.clearTimeout(loadingInfoTimerRef.current);
      loadingInfoTimerRef.current = null;
    }
  }, []);

  const fetchWordDefinition = useCallback(async (word: string) => {
    const fallback =
      WORD_DEFINITIONS[word] ||
      "A useful term in this context. Save it and connect it to what you just read.";

    const cachedDefinition = definitionCacheRef.current[word];
    if (cachedDefinition) {
      return cachedDefinition;
    }

    try {
      const response = await fetch(
        `https://freedictionaryapi.com/api/v1/entries/en/${encodeURIComponent(word)}?pretty=false`,
      );
      if (response.status === 429) {
        const rateLimited =
          "Dictionary rate limit reached. Please try again after a short while.";
        definitionCacheRef.current[word] = rateLimited;
        return rateLimited;
      }
      if (!response.ok) {
        definitionCacheRef.current[word] = fallback;
        return fallback;
      }

      const data = (await response.json()) as DictionaryApiResponse;
      const entries = Array.isArray(data) ? data : data.entries || [];
      const firstDefinition = entries
        ?.flatMap((entry) => entry.senses || [])
        .flatMap((sense) => [sense, ...(sense.subsenses || [])])
        .find((item) => typeof item.definition === "string")?.definition;

      const resolvedDefinition = firstDefinition || fallback;
      definitionCacheRef.current[word] = resolvedDefinition;
      return resolvedDefinition;
    } catch {
      definitionCacheRef.current[word] = fallback;
      return fallback;
    }
  }, []);

  const onWordTapAsync = useCallback(
    async (event: React.MouseEvent<HTMLElement>, rawWord: string) => {
      event.stopPropagation();
      const cleanWord = rawWord.toLowerCase().replace(/[^a-z'-]/g, "");
      if (!cleanWord) {
        return;
      }

      const rect = event.currentTarget.getBoundingClientRect();
      const position = getFloatingPosition(rect);
      const requestId = definitionRequestIdRef.current + 1;
      definitionRequestIdRef.current = requestId;

      setWordPopup({
        text: `${cleanWord}: Loading meaning...`,
        x: position.x,
        y: position.y,
        placeAbove: position.placeAbove,
      });
      setSelectionMenu(null);

      const definition = await fetchWordDefinition(cleanWord);
      if (requestId !== definitionRequestIdRef.current) {
        return;
      }

      setWordPopup({
        text: `${cleanWord}: ${definition}`,
        x: position.x,
        y: position.y,
        placeAbove: position.placeAbove,
      });
    },
    [fetchWordDefinition, getFloatingPosition],
  );

  const onSelectionChange = useCallback(() => {
    if (typeof window === "undefined") {
      return;
    }

    const selection = window.getSelection();
    const selectedText = selection?.toString().trim() || "";
    if (!selection || !selectedText) {
      setSelectionMenu(null);
      return;
    }

    const range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range || !readingContainerRef.current) {
      setSelectionMenu(null);
      return;
    }

    const isInsideReader = readingContainerRef.current.contains(
      range.commonAncestorContainer,
    );
    if (!isInsideReader) {
      setSelectionMenu(null);
      return;
    }

    const rect = range.getBoundingClientRect();
    const position = getFloatingPosition(rect);
    setSelectionMenu({
      text: selectedText,
      x: position.x,
      y: position.y,
      placeAbove: position.placeAbove,
    });
    setWordPopup(null);
  }, [getFloatingPosition]);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissMenus();
      }
    };

    document.addEventListener("mouseup", onSelectionChange);
    document.addEventListener("keyup", onSelectionChange);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mouseup", onSelectionChange);
      document.removeEventListener("keyup", onSelectionChange);
      document.removeEventListener("keydown", closeOnEscape);
      stopSpeech();
    };
  }, [dismissMenus, onSelectionChange, stopSpeech]);

  useEffect(() => {
    return () => {
      if (loadingInfoTimerRef.current !== null) {
        window.clearTimeout(loadingInfoTimerRef.current);
      }
    };
  }, []);

  const handleAction = async (action: ReaderAction) => {
    if (!selectionMenu?.text) {
      return;
    }

    try {
      setLoadingAction(action);
      setLoadingInfo(
        action === "Explain"
          ? "Explaining your selected text..."
          : "Summarizing your selected text...",
      );
      if (loadingInfoTimerRef.current !== null) {
        window.clearTimeout(loadingInfoTimerRef.current);
      }
      loadingInfoTimerRef.current = window.setTimeout(() => {
        setLoadingInfo("Still working... AI is likely handling high demand.");
      }, 1800);
      setAssistantPopup(null);
      const selectedText = selectionMenu.text;
      const response = await fetch("/api/gemini", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action,
          text: selectedText,
        }),
      });

      const data: {
        result?: string;
        error?: string;
        details?: string;
        retryable?: boolean;
      } = await response.json();
      const snippet = response.ok
        ? data.result || "No response returned from Gemini."
        : data.error || "Gemini request failed.";

      setAssistantPopup({
        title: action,
        text: snippet,
        x: selectionMenu.x,
        y: selectionMenu.placeAbove
          ? selectionMenu.y - 56
          : selectionMenu.y + 56,
        placeAbove: selectionMenu.placeAbove,
        retryable: !response.ok && Boolean(data.retryable),
        sourceText: selectedText,
      });
    } catch {
      setAssistantPopup({
        title: action,
        text: "Unable to reach the Gemini API right now.",
        x: selectionMenu.x,
        y: selectionMenu.placeAbove
          ? selectionMenu.y - 56
          : selectionMenu.y + 56,
        placeAbove: selectionMenu.placeAbove,
        retryable: true,
        sourceText: selectionMenu.text,
      });
    } finally {
      setLoadingAction(null);
      setLoadingInfo(null);
      if (loadingInfoTimerRef.current !== null) {
        window.clearTimeout(loadingInfoTimerRef.current);
        loadingInfoTimerRef.current = null;
      }
    }
  };

  const retryAssistantAction = () => {
    if (!assistantPopup) {
      return;
    }

    void handleAction(assistantPopup.title);
  };

  const moveParagraph = (direction: 1 | -1) => {
    setActiveParagraph((current) => {
      const next = current + direction;
      if (next < 0) {
        return 0;
      }
      if (next > READING_PARAGRAPHS.length - 1) {
        return READING_PARAGRAPHS.length - 1;
      }
      return next;
    });
    dismissMenus();
  };

  const handleGoBack = () => {
    if (typeof window !== "undefined") {
      window.history.back();
    }
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden bg-[#07090e] px-4 py-4 text-white sm:px-6"
      onClick={dismissMenus}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,rgba(102,178,255,0.17),transparent_32%),radial-gradient(circle_at_84%_12%,rgba(252,208,117,0.11),transparent_28%),linear-gradient(180deg,#080b11_0%,#07090e_100%)]" />

      <section className="relative mx-auto flex min-h-[calc(100vh-2rem)] w-full max-w-5xl flex-col overflow-hidden rounded-[24px] border border-white/10 bg-[#0f141d]/90 shadow-[0_20px_70px_rgba(0,0,0,0.5)]">
        <div className="h-1.5 bg-white/6">
          <div
            className="h-full rounded-r-full bg-read-gradient transition-all duration-300"
            style={{ width: `${progressValue}%` }}
          />
        </div>

        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5 font-body text-sm text-white/85 transition hover:border-white/30 hover:text-white"
            aria-label="Go back"
          >
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            Back
          </button>

          <p className="font-body text-sm font-semibold tracking-[0.06em] text-white/90">
            {progressValue}%
          </p>

          <button
            type="button"
            onClick={() => {
              setFocusMode((prev) => !prev);
              dismissMenus();
            }}
            className={`inline-flex items-center rounded-full border px-3 py-1.5 font-body text-xs font-semibold uppercase tracking-[0.12em] transition ${
              focusMode
                ? "border-[#ffd57d]/70 bg-[#ffd57d]/15 text-[#ffe6b1]"
                : "border-white/20 bg-transparent text-white/80 hover:border-white/35"
            }`}
          >
            Focus Mode {focusMode ? "On" : "Off"}
          </button>
        </header>

        <div
          ref={readingContainerRef}
          className="relative flex-1 overflow-y-auto px-5 py-8 sm:px-8"
        >
          <div className="mx-auto w-full max-w-[600px] space-y-7">
            {READING_PARAGRAPHS.map((paragraph, paragraphIndex) => {
              const isCurrent = paragraphIndex === activeParagraph;
              const isDimmed = focusMode && !isCurrent;

              return (
                <p
                  key={paragraphIndex}
                  onClick={(event) => {
                    event.stopPropagation();
                    setActiveParagraph(paragraphIndex);
                  }}
                  className={`font-reader text-[18px] leading-[2] tracking-[0.005em] transition duration-300 ${
                    focusMode
                      ? isCurrent
                        ? "rounded-xl bg-[#1f2836]/70 px-3 py-2 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)]"
                        : "max-h-9 overflow-hidden select-none text-white/20 blur-[3px]"
                      : isCurrent
                        ? "text-white"
                        : "text-white/85"
                  }`}
                >
                  {paragraph.split(" ").map((word, wordIndex) => (
                    <span
                      key={`${paragraphIndex}-${wordIndex}`}
                      role="button"
                      tabIndex={isDimmed ? -1 : 0}
                      className={`inline rounded-sm px-[1px] transition ${
                        isDimmed
                          ? "cursor-default"
                          : "cursor-pointer hover:bg-white/10"
                      }`}
                      onClick={(event) => {
                        if (isDimmed) {
                          return;
                        }
                        void onWordTapAsync(event, word);
                      }}
                      onKeyDown={(event) => {
                        if (isDimmed) {
                          return;
                        }
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          void onWordTapAsync(
                            event as unknown as React.MouseEvent<HTMLElement>,
                            word,
                          );
                        }
                      }}
                    >
                      {word}{" "}
                    </span>
                  ))}
                </p>
              );
            })}
          </div>

          {focusMode ? (
            <div className="pointer-events-none fixed inset-x-0 bottom-5 z-40 flex justify-end px-5 sm:px-8">
              <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-white/14 bg-[#111826]/95 p-2 shadow-[0_10px_28px_rgba(0,0,0,0.35)]">
                <button
                  type="button"
                  onClick={() => moveParagraph(-1)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-white/14 bg-white/[0.03] px-4 text-sm text-white/90 transition hover:border-white/30 hover:bg-white/[0.06] disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={activeParagraph === 0}
                  aria-label="Previous paragraph"
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() => moveParagraph(1)}
                  className="inline-flex h-11 items-center gap-2 rounded-full border border-[#66b2ff]/45 bg-[#66b2ff]/15 px-4 text-sm font-semibold text-[#d6ecff] transition hover:bg-[#66b2ff]/20 disabled:cursor-not-allowed disabled:opacity-35"
                  disabled={activeParagraph === READING_PARAGRAPHS.length - 1}
                  aria-label="Next paragraph"
                >
                  Next →
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <footer className="flex items-center justify-between gap-3 border-t border-white/10 px-4 py-3 sm:px-6">
          <button
            type="button"
            onClick={() => {
              if (isSpeaking) {
                stopSpeech();
                return;
              }
              playSpeech();
            }}
            className="inline-flex items-center gap-2 rounded-full border border-[#66b2ff]/45 bg-[#66b2ff]/15 px-4 py-2 font-body text-sm font-semibold text-[#d6ecff] transition hover:bg-[#66b2ff]/20"
          >
            {isSpeaking ? "Stop" : "Play"}
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 font-body text-sm text-white/88 transition hover:border-white/35"
            >
              AI Assist
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.03] px-4 py-2 font-body text-sm text-white/88 transition hover:border-white/35"
            >
              Settings
            </button>
          </div>
        </footer>
      </section>

      {wordPopup ? (
        <div
          className={`fixed z-50 max-w-[min(88vw,380px)] -translate-x-1/2 rounded-xl border border-[#66b2ff]/45 bg-[#111826] px-3 py-2 text-sm text-[#dcecff] shadow-[0_10px_32px_rgba(0,0,0,0.45)] ${
            wordPopup.placeAbove ? "-translate-y-full" : ""
          }`}
          style={{ left: wordPopup.x, top: wordPopup.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {wordPopup.text}
        </div>
      ) : null}

      {selectionMenu ? (
        <div
          className={`fixed z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/20 bg-[#10151f]/95 p-1 shadow-[0_10px_32px_rgba(0,0,0,0.5)] ${
            selectionMenu.placeAbove ? "-translate-y-full" : ""
          }`}
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          {(["Explain", "Summarize"] as const).map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => handleAction(action)}
              disabled={loadingAction !== null}
              className="rounded-full border border-transparent px-3 py-1.5 font-body text-xs font-semibold uppercase tracking-[0.08em] text-white/90 transition hover:border-white/20 hover:bg-white/10"
            >
              {loadingAction === action
                ? action === "Explain"
                  ? "Explaining..."
                  : "Summarizing..."
                : action}
            </button>
          ))}
        </div>
      ) : null}

      {selectionMenu && loadingAction ? (
        <div
          className="fixed z-50 max-w-[min(88vw,420px)] -translate-x-1/2 rounded-xl border border-[#66b2ff]/40 bg-[#102033]/95 px-3 py-2 text-xs font-medium text-[#d6ecff] shadow-[0_10px_30px_rgba(0,0,0,0.45)]"
          style={{
            left: selectionMenu.x,
            top: selectionMenu.placeAbove
              ? selectionMenu.y + 14
              : selectionMenu.y + 50,
          }}
        >
          {loadingInfo || "Working on it..."}
        </div>
      ) : null}

      {assistantPopup ? (
        <div
          className={`fixed z-50 max-w-[min(90vw,420px)] -translate-x-1/2 rounded-2xl border border-[#ffd57d]/35 bg-[#17120b] px-4 py-3 text-sm text-[#fff0cc] shadow-[0_12px_36px_rgba(0,0,0,0.45)] ${
            assistantPopup.placeAbove ? "-translate-y-full" : ""
          }`}
          style={{ left: assistantPopup.x, top: assistantPopup.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ffd57d]">
            Gemini {assistantPopup.title}
          </p>
          <p className="mt-2 leading-6 text-[#fff4db]">{assistantPopup.text}</p>
          {assistantPopup.retryable ? (
            <button
              type="button"
              onClick={retryAssistantAction}
              disabled={loadingAction !== null}
              className="mt-3 inline-flex items-center rounded-full border border-[#ffd57d]/50 bg-[#ffd57d]/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[#ffe7b5] transition hover:bg-[#ffd57d]/18 disabled:opacity-60"
            >
              {loadingAction ? "Retrying..." : "Retry"}
            </button>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
