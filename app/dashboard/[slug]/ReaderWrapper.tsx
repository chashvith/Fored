"use client";

import Reader from "@/components/Reader";
import { useBookStore } from "@/store/useBookStore";

export default function ReaderWrapper({ slug }: { slug: string }) {
  const books = useBookStore((state) => state.books);
  const book = books[slug] || books["atomic-habits"];

  return (
    <Reader
      title={book.title}
      author={book.author}
      chapter={book.chapter}
      progress={book.progress}
      paragraphs={book.paragraphs}
    />
  );
}
