"use client";

import { useState } from "react";
import Link from "next/link";
import { useBookStore } from "@/store/useBookStore";
import dynamic from "next/dynamic";
const UploadModal = dynamic(() => import("@/components/UploadModal"), { ssr: false });
import { Plus, Trash2 } from "lucide-react";
import { deletePdfBlob } from "@/lib/pdfStorage";

export default function DashboardPage() {
  const books = useBookStore((state) => state.books);
  const removeBook = useBookStore((state) => state.removeBook);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const bookList = Object.values(books).sort((left, right) => right.progress - left.progress);
  const booksOnShelf = bookList.length;
  const activeReadingCount = bookList.filter((book) => book.progress > 0 && book.progress < 100).length;
  const averageProgress =
    bookList.length === 0
      ? 0
      : Math.round(bookList.reduce((sum, book) => sum + book.progress, 0) / bookList.length);
  const stats = [
    { label: "Books on shelf", value: String(booksOnShelf) },
    { label: "Average progress", value: `${averageProgress}%` },
    { label: "Reading now", value: String(activeReadingCount) },
  ];

  const handleDelete = async (slug: string) => {
    if (confirm("Are you sure you want to delete this book?")) {
      removeBook(slug);
      try {
        await deletePdfBlob(slug);
      } catch (e) {
        console.error("Failed to delete from storage", e);
      }
    }
  };

  return (
    <main className="min-h-screen bg-[var(--app-bg)] px-4 py-6 text-[color:var(--app-text)] sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[var(--app-border)] pb-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--app-muted)]">
              Dashboard
            </p>
            <h1 className="mt-2 text-[clamp(2rem,4vw,3.4rem)] font-semibold tracking-[-0.04em] text-[color:var(--app-text)]">
              Your reading shelf
            </h1>
            <p className="mt-2 max-w-2xl text-[15px] leading-7 text-[color:var(--app-muted)]">
              Pick a book to open the reading screen. This page stays clean and
              focused, with the books acting like a simple library.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/5 px-4 py-2 text-sm font-semibold text-purple-400 hover:bg-purple-500 hover:text-white transition-all duration-200"
            >
              <Plus className="h-4 w-4" />
              <span>Import document</span>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-[var(--app-border)] bg-[var(--app-surface)] px-4 py-3 shadow-[0_10px_24px_var(--app-raise)]"
              >
                <p className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                  {item.label}
                </p>
                <p className="mt-2 text-lg font-semibold text-[color:var(--app-text)]">
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {/* Import document card */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="group flex flex-col items-center justify-center rounded-[24px] border border-dashed border-[var(--app-border)] bg-[var(--app-surface)]/30 p-5 shadow-[0_12px_30px_var(--app-raise)] hover:border-purple-500/40 hover:bg-[var(--app-surface)]/80 transition-all duration-200 min-h-[220px]"
          >
            <div className="rounded-full bg-purple-500/10 p-3.5 transition-transform duration-300 group-hover:scale-110">
              <Plus className="h-6 w-6 text-purple-400" />
            </div>
            <p className="mt-4 text-base font-semibold text-[color:var(--app-text)]">Import document</p>
            <p className="mt-1 text-xs text-[color:var(--app-muted)]">Upload a PDF or EPUB file</p>
          </button>

          {bookList.map((book) => (
            <article
              key={book.slug}
              className="group rounded-[24px] border border-[var(--app-border)] bg-[var(--app-surface)] p-5 shadow-[0_12px_30px_var(--app-raise)] transition-transform duration-200 hover:-translate-y-1"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--app-muted)]">
                    {book.status}
                  </p>
                  <h2 className="mt-2 text-[1.35rem] font-semibold leading-tight tracking-[-0.03em] text-[color:var(--app-text)]">
                    {book.title}
                  </h2>
                  <p className="mt-1 text-sm text-[color:var(--app-muted)]">{book.author}</p>
                </div>

                <div className="flex items-center gap-2">
                  <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1 text-sm font-semibold text-[color:var(--app-text)]">
                    {book.progress}%
                  </div>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      handleDelete(book.slug);
                    }}
                    className="p-1.5 text-[color:var(--app-muted)] hover:text-red-500 transition-colors rounded-full border border-transparent hover:border-red-500/30 hover:bg-red-500/10"
                    aria-label="Delete book"
                    title="Delete book"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-5">
                <div className="h-2 overflow-hidden rounded-full bg-[var(--app-surface-2)]">
                  <div
                    className="h-full rounded-full bg-[color:var(--app-text)] transition-all duration-300"
                    style={{ width: `${book.progress}%` }}
                  />
                </div>
                <p className="mt-2 text-sm text-[color:var(--app-muted)]">{book.note}</p>
              </div>

              <Link
                href={`/dashboard/${book.slug}`}
                className="mt-5 inline-flex items-center justify-center rounded-full border border-[var(--app-border)] bg-[color:var(--app-text)] px-4 py-2.5 text-sm font-semibold text-[color:var(--app-bg)] transition-colors hover:bg-transparent hover:text-[color:var(--app-text)]"
              >
                Open reading page
              </Link>
            </article>
          ))}
        </section>
      </section>

      <UploadModal isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </main>
  );
}