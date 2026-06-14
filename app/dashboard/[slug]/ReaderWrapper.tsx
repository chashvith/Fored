"use client";

import Reader from "@/components/Reader";
import dynamic from "next/dynamic";
// const PdfReader = dynamic(() => import("@/components/PdfReader"), { ssr: false });
const EpubReader = dynamic(() => import("@/components/EpubReader"), { ssr: false });
import { useBookStore } from "@/store/useBookStore";

export default function ReaderWrapper({ slug }: { slug: string }) {
  const books = useBookStore((state) => state.books);
  const book = books[slug];

  // Book not found — fall back to first book or show nothing
  if (!book) {
    const fallback = books["atomic-habits"];
    if (!fallback) {
      return (
        <div className="min-h-screen flex items-center justify-center text-[color:var(--app-muted)]">
          Book not found.
        </div>
      );
    }
    return (
      <Reader
        slug={fallback.slug}
        title={fallback.title}
        author={fallback.author}
        chapter={fallback.chapter}
        progress={fallback.progress}
        paragraphs={fallback.paragraphs}
      />
    );
  }

  // PDF books use the new PdfReader
  /*
  if (book.type === "pdf") {
    return <PdfReader slug={book.slug} />;
  }
  */

  // EPUB books use the native EpubReader
  if (book.type === "epub") {
    return <EpubReader slug={book.slug} />;
  }

  // Paragraph-based books (including hardcoded ones) use the existing Reader
  return (
    <Reader
      slug={book.slug}
      title={book.title}
      author={book.author}
      chapter={book.chapter}
      progress={book.progress}
      paragraphs={book.paragraphs}
    />
  );
}
