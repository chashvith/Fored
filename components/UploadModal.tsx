"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
// import * as pdfjsLib from "pdfjs-dist";
import ePub from "epubjs";
import { useBookStore, type Book } from "@/store/useBookStore";
import { savePdfBlob } from "@/lib/pdfStorage";

// Set up the PDF.js worker
// pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

type UploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export default function UploadModal({ isOpen, onClose }: UploadModalProps) {
  const router = useRouter();
  const addBook = useBookStore((state) => state.addBook);

  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ title: string; detail: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await processFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      await processFile(e.target.files[0]);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const processFile = async (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "pdf") {
      setError("PDF support coming soon.");
      return;
    }

    if (!ext || !["epub"].includes(ext)) {
      setError("Only EPUB files are supported.");
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError("File size exceeds 50MB limit.");
      return;
    }

    setError(null);
    setLoading(true);
    setSuccess(null);

    try {
      // if (ext === "pdf") {
      //   await processPdf(file);
      // } else {
        await processEpub(file);
      // }
    } catch (err) {
      console.error(err);
      setError((err as Error).message || "An unexpected error occurred during import.");
    } finally {
      setLoading(false);
    }
  };

  // ── PDF processing (client-side with PDF.js) ─────────────────────
  /*
  const processPdf = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();

    // Use PDF.js to extract metadata and page count
    const doc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const metadata = await doc.getMetadata().catch(() => null);

    const info = metadata?.info as Record<string, any> | undefined;
    const title = info?.Title || file.name.replace(/\.pdf$/i, "");
    const author = info?.Author || "Unknown Author";
    const totalPages = doc.numPages;

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug || "untitled"}-${uniqueSuffix}`;

    // Extract text from each page to satisfy database schema requirements
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      try {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const text = textContent.items.map((item: any) => item.str).join(" ");
        pages.push({ pageNumber: i, text });
      } catch (e) {
        console.warn(`Failed to extract text from page ${i}`, e);
        pages.push({ pageNumber: i, text: "" });
      }
    }

    // Store PDF blob in IndexedDB
    await savePdfBlob(slug, arrayBuffer);

    // Calculate reading time estimate
    const readingTime = `${Math.max(1, Math.round(totalPages * 1.5))} min read`;

    const newBook: Book = {
      slug,
      title: title || "Untitled Document",
      author: author || "Unknown Author",
      progress: 0,
      status: "Ready to read",
      note: `${totalPages} pages · Just uploaded`,
      chapter: "Page 1",
      readingTime,
      paragraphs: [],
      type: "pdf",
      totalPages,
      currentPage: 1,
      pages,
      highlights: [],
      bookmarks: [],
    };

    addBook(newBook);
    setSuccess({ title: newBook.title, detail: `${totalPages} pages ready` });

    setTimeout(() => {
      onClose();
      router.push(`/dashboard/${slug}`);
    }, 1500);
  };
  */

  // ── EPUB processing (client-side with epubjs) ─────────────────────
  const processEpub = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();

    // Use epubjs to extract metadata
    const book = ePub(arrayBuffer);
    const metadata = await book.loaded.metadata;

    const title = metadata?.title || file.name.replace(/\.epub$/i, "");
    const author = metadata?.creator || "Unknown Author";

    // Generate slug
    const baseSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
    const uniqueSuffix = Math.random().toString(36).substring(2, 7);
    const slug = `${baseSlug || "untitled"}-${uniqueSuffix}`;

    // Store EPUB blob in IndexedDB (reusing the same storage mechanism)
    await savePdfBlob(slug, arrayBuffer);

    const newBook: Book = {
      slug,
      title: title || "Untitled Document",
      author: author || "Unknown Author",
      progress: 0,
      status: "Ready to read",
      note: `Just uploaded`,
      chapter: "Start",
      readingTime: "10 min read",
      paragraphs: [],
      type: "epub",
      totalPages: 100, // Epubjs locations will be generated in reader
      currentPage: 1,
      highlights: [],
      bookmarks: [],
    };

    addBook(newBook);
    setSuccess({ title: newBook.title, detail: `EPUB ready` });

    setTimeout(() => {
      onClose();
      router.push(`/dashboard/${slug}`);
    }, 1500);
  };

  const resetModal = () => {
    setError(null);
    setLoading(false);
    setSuccess(null);
    setDragActive(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={loading ? undefined : onClose}
          />

          {/* Modal Container */}
          <motion.div
            className="relative w-full max-w-lg overflow-hidden rounded-[24px] border border-[var(--app-border)] bg-[#111118] p-6 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
            initial={{ scale: 0.95, y: 15, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.95, y: 15, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-[var(--app-border)]">
              <div>
                <h3 className="text-xl font-semibold tracking-[-0.02em] text-[color:var(--app-text)]">
                  Import document
                </h3>
                <p className="text-xs text-[color:var(--app-muted)] mt-1">
                  Upload an EPUB to start reading
                </p>
              </div>
              {!loading && (
                <button
                  onClick={onClose}
                  className="rounded-full p-1.5 text-[color:var(--app-muted)] hover:bg-[color:var(--app-surface-2)] hover:text-[color:var(--app-text)] transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="mt-6">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="relative flex items-center justify-center">
                    <Loader2 className="h-12 w-12 animate-spin text-purple-500" />
                    <div className="absolute inset-0 rounded-full border border-purple-500/20 animate-pulse" />
                  </div>
                  <h4 className="mt-6 text-base font-medium text-[color:var(--app-text)]">
                    Preparing document
                  </h4>
                  <p className="mt-2 text-sm text-[color:var(--app-muted)] max-w-xs leading-relaxed">
                    Reading pages, extracting metadata, and preparing the rendering engine...
                  </p>
                  <div className="mt-6 w-48 h-1 overflow-hidden rounded-full bg-purple-950/40">
                    <motion.div
                      className="h-full bg-gradient-to-r from-purple-500 to-indigo-400"
                      initial={{ width: "0%" }}
                      animate={{ width: "95%" }}
                      transition={{ duration: 8, ease: "easeOut" }}
                    />
                  </div>
                </div>
              ) : success ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 200, damping: 15 }}
                  >
                    <CheckCircle2 className="h-16 w-16 text-emerald-500" />
                  </motion.div>
                  <h4 className="mt-6 text-lg font-semibold text-[color:var(--app-text)]">
                    Import successful!
                  </h4>
                  <p className="mt-2 text-sm text-emerald-400 font-medium">
                    &ldquo;{success.title}&rdquo;
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--app-muted)]">
                    {success.detail}. Opening in reader...
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertCircle className="h-12 w-12 text-rose-500" />
                  <h4 className="mt-4 text-base font-medium text-[color:var(--app-text)]">
                    Failed to import document
                  </h4>
                  <p className="mt-2 text-sm text-rose-400/90 max-w-sm">
                    {error}
                  </p>
                  <button
                    onClick={resetModal}
                    className="mt-6 rounded-full border border-rose-950 bg-rose-950/20 px-5 py-2 text-sm font-semibold text-rose-300 transition-colors hover:bg-rose-950/40"
                  >
                    Try again
                  </button>
                </div>
              ) : (
                <div
                  onDragEnter={handleDrag}
                  onDragOver={handleDrag}
                  onDragLeave={handleDrag}
                  onDrop={handleDrop}
                  onClick={triggerFileInput}
                  className={`group relative flex flex-col items-center justify-center rounded-[20px] border-2 border-dashed py-12 px-6 text-center cursor-pointer transition-all duration-300 ${
                    dragActive
                      ? "border-purple-500 bg-purple-500/5 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                      : "border-[var(--app-border)] hover:border-purple-500/40 hover:bg-[color:var(--app-surface-2)]/50"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".epub"
                    onChange={handleChange}
                  />
                  
                  <div className="rounded-full bg-[var(--app-surface-2)] p-4 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-105">
                    <Upload className="h-7 w-7 text-purple-400 group-hover:text-purple-300" />
                  </div>
                  
                  <p className="mt-6 text-sm font-semibold text-[color:var(--app-text)]">
                    Drag &amp; drop document here, or <span className="text-purple-400 group-hover:underline">browse</span>
                  </p>
                  
                  <p className="mt-2 text-xs text-[color:var(--app-muted)] max-w-xs leading-relaxed">
                    EPUBs are extracted into flowing text.
                  </p>

                  <div className="mt-6 flex items-center justify-center gap-4 border-t border-[var(--app-border)]/50 pt-4 w-full text-[11px] text-[color:var(--app-muted)] uppercase tracking-wider">
                    <span>EPUB format</span>
                    <span className="h-1 w-1 rounded-full bg-[color:var(--app-muted)]" />
                    <span>Max 50MB</span>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
