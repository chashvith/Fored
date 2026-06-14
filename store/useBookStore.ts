import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Highlight = {
  id: string;
  pageNumber: number;
  text: string;
  color: string;
  createdAt: number;
  cfi?: string;
};

export type PdfPage = {
  pageNumber: number;
  text: string;
  html?: string;
  image?: string;
};

export type Book = {
  slug: string;
  title: string;
  author: string;
  progress: number;
  status: string;
  note: string;
  chapter: string;
  readingTime: string;
  paragraphs: string[];
  // PDF and EPUB specific fields
  type?: "paragraphs" | "pdf" | "epub";
  totalPages?: number;
  currentPage?: number;
  pages?: PdfPage[];
  highlights?: Highlight[];
  bookmarks?: number[];
};

export type ShelfStats = {
  label: string;
  value: string;
};

interface BookStore {
  books: Record<string, Book>;
  updateProgress: (slug: string, progress: number) => void;
  updateBookStatus: (slug: string, status: string) => void;
  addBookmark: (slug: string, note: string) => void;
  addBook: (book: Book) => void;
  setCurrentPage: (slug: string, page: number) => void;
  addHighlight: (slug: string, highlight: Highlight) => void;
  removeHighlight: (slug: string, highlightId: string) => void;
  toggleBookmark: (slug: string, pageNumber: number) => void;
  removeBook: (slug: string) => void;
}

const initialBooks: Record<string, Book> = {
  "atomic-habits": {
    slug: "atomic-habits",
    title: "Atomic Habits",
    author: "James Clear",
    progress: 68,
    status: "Resume reading",
    note: "Chapter 6 · 3 highlights saved",
    chapter: "Chapter 6",
    readingTime: "12 min session",
    type: "paragraphs",
    paragraphs: [
      "Most people do not need more motivation. They need less friction. A good reading habit starts by making the next page easier to open than your favorite distraction app.",
      "Attention is not a switch. It is a spotlight that drifts. When you notice your mind wander, you do not fail. You simply return the light to the line and continue.",
      "Small sessions stack. Twelve focused minutes every day can outperform a single long session done once a week, because memory strengthens through repeated retrieval.",
    ],
  },
  "deep-work": {
    slug: "deep-work",
    title: "Deep Work",
    author: "Cal Newport",
    progress: 42,
    status: "In progress",
    note: "Chapter 3 · 12 notes saved",
    chapter: "Chapter 3",
    readingTime: "10 min session",
    type: "paragraphs",
    paragraphs: [
      "Deep work is what separates noise from output. The core skill is not being busy, but protecting uninterrupted attention long enough for real thought to happen.",
      "When work is fragmented, quality falls and recovery time rises. A clear boundary around focused time makes the mind easier to trust.",
      "The point is not intensity for its own sake. It is to build a repeatable ritual that lets hard thinking become normal.",
    ],
  },
  "essentialism": {
    slug: "essentialism",
    title: "Essentialism",
    author: "Greg McKeown",
    progress: 21,
    status: "Next up",
    note: "Intro · 5 bookmarks",
    chapter: "Intro",
    readingTime: "8 min session",
    type: "paragraphs",
    paragraphs: [
      "Essentialism asks a simple question with serious consequences: what deserves your effort, and what does not? The work begins by choosing what to ignore.",
      "A scattered life often looks full but feels thin. Less noise can create more room for the things that actually matter.",
      "Clarity usually arrives after subtraction, not accumulation.",
    ],
  },
  "the-one-thing": {
    slug: "the-one-thing",
    title: "The One Thing",
    author: "Gary Keller",
    progress: 89,
    status: "Almost done",
    note: "Final chapter · 2 ideas to revisit",
    chapter: "Final chapter",
    readingTime: "6 min session",
    type: "paragraphs",
    paragraphs: [
      "Extra tasks can disguise themselves as progress. The discipline is to keep choosing the single action that makes other actions easier or unnecessary.",
      "A focused day is not built by chance. It is built by removing small decisions that drain attention before meaningful work begins.",
      "Momentum comes from making one thing obvious and everything else secondary.",
    ],
  },
  "make-time": {
    slug: "make-time",
    title: "Make Time",
    author: "Jake Knapp and John Zeratsky",
    progress: 56,
    status: "Reading now",
    note: "Chapter 8 · focus sprint template",
    chapter: "Chapter 8",
    readingTime: "14 min session",
    type: "paragraphs",
    paragraphs: [
      "Time is not found. It is designed. The shape of the day changes when you choose the highlight before the rush starts.",
      "A small, intentional sprint is often enough to make the day feel owned instead of spent.",
      "The goal is not perfect efficiency. It is a calmer relationship with attention.",
    ],
  },
  "thinking-fast-and-slow": {
    slug: "thinking-fast-and-slow",
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    progress: 12,
    status: "Queued",
    note: "First chapter · 1 annotation",
    chapter: "First chapter",
    readingTime: "9 min session",
    type: "paragraphs",
    paragraphs: [
      "Judgment feels immediate, but it is often built from shortcuts. Learning where those shortcuts help and where they mislead is part of thinking well.",
      "The mind prefers easy answers. Careful reading slows that reflex down just enough to notice the pattern underneath.",
      "Good decisions often depend on asking one more question than feels necessary.",
    ],
  },
};

export const useBookStore = create<BookStore>()(
  persist(
    (set) => ({
      books: initialBooks,
      updateProgress: (slug, progress) =>
        set((state) => ({
          books: {
            ...state.books,
            [slug]: { ...state.books[slug], progress },
          },
        })),
      updateBookStatus: (slug, status) =>
        set((state) => ({
          books: {
            ...state.books,
            [slug]: { ...state.books[slug], status },
          },
        })),
      addBookmark: (slug, note) =>
        set((state) => ({
          books: {
            ...state.books,
            [slug]: { ...state.books[slug], note },
          },
        })),
      addBook: (book) =>
        set((state) => ({
          books: {
            ...state.books,
            [book.slug]: book,
          },
        })),
      setCurrentPage: (slug, page) =>
        set((state) => {
          const book = state.books[slug];
          if (!book) return state;
          const totalPages = book.totalPages || 1;
          const progress = Math.round((page / totalPages) * 100);
          return {
            books: {
              ...state.books,
              [slug]: {
                ...book,
                currentPage: page,
                progress: Math.min(100, progress),
                status: progress >= 100 ? "Finished" : "Reading now",
              },
            },
          };
        }),
      addHighlight: (slug, highlight) =>
        set((state) => {
          const book = state.books[slug];
          if (!book) return state;
          const existing = book.highlights || [];
          return {
            books: {
              ...state.books,
              [slug]: {
                ...book,
                highlights: [...existing, highlight],
                note: `${existing.length + 1} highlights`,
              },
            },
          };
        }),
      removeHighlight: (slug, highlightId) =>
        set((state) => {
          const book = state.books[slug];
          if (!book) return state;
          const filtered = (book.highlights || []).filter(
            (h) => h.id !== highlightId
          );
          return {
            books: {
              ...state.books,
              [slug]: {
                ...book,
                highlights: filtered,
                note: `${filtered.length} highlights`,
              },
            },
          };
        }),
      toggleBookmark: (slug, pageNumber) =>
        set((state) => {
          const book = state.books[slug];
          if (!book) return state;
          const current = book.bookmarks || [];
          const exists = current.includes(pageNumber);
          const next = exists
            ? current.filter((p) => p !== pageNumber)
            : [...current, pageNumber].sort((a, b) => a - b);
          return {
            books: {
              ...state.books,
              [slug]: { ...book, bookmarks: next },
            },
          };
        }),
      removeBook: (slug) =>
        set((state) => {
          const { [slug]: _, ...remainingBooks } = state.books;
          return { books: remainingBooks };
        }),
    }),
    {
      name: "focusread-book-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ books: state.books }),
    }
  )
);
