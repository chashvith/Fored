import { create } from "zustand";

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
};

export type ShelfStats = {
  label: string;
  value: string;
};

interface BookStore {
  books: Record<string, Book>;
  stats: ShelfStats[];
  updateProgress: (slug: string, progress: number) => void;
  updateBookStatus: (slug: string, status: string) => void;
  addBookmark: (slug: string, note: string) => void;
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
    paragraphs: [
      "Judgment feels immediate, but it is often built from shortcuts. Learning where those shortcuts help and where they mislead is part of thinking well.",
      "The mind prefers easy answers. Careful reading slows that reflex down just enough to notice the pattern underneath.",
      "Good decisions often depend on asking one more question than feels necessary.",
    ],
  },
};

const initialStats = [
  { label: "Books on shelf", value: "6" },
  { label: "Active streak", value: "4 days" },
  { label: "Focus goal", value: "12 mins" },
];

export const useBookStore = create<BookStore>((set) => ({
  books: initialBooks,
  stats: initialStats,
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
}));
