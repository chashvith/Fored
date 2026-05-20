"use client";

import Link from "next/link";
import { useBookStore } from "@/store/useBookStore";

export default function DashboardPage() {
  const books = useBookStore((state) => state.books);
  const stats = useBookStore((state) => state.stats);
  const bookList = Object.values(books);

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

                <div className="rounded-full border border-[var(--app-border)] bg-[var(--app-surface-2)] px-3 py-1 text-sm font-semibold text-[color:var(--app-text)]">
                  {book.progress}%
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
    </main>
  );
}