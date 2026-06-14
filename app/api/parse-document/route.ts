import { NextResponse } from "next/server";
import unzipper from "unzipper";
import { JSDOM } from "jsdom";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";

// EPUB extraction has been moved to the client side via epub.js

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("file") as unknown as File | null;

    if (!file) {
      return NextResponse.json({ error: "Missing file parameter" }, { status: 400 });
    }

    const filename = file.name || `document-${Date.now()}`;
    const fileExt = filename.split(".").pop()?.toLowerCase();

    const arrBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrBuffer);

    let title = filename.replace(/\.[^/.]+$/, ""); // Strip file extension
    let author = "Unknown Author";
    let paragraphs: string[] = [];
    let pages: { pageNumber: number; text: string }[] = [];

    if (fileExt === "pdf") {
      // Configure PDF.js for Node.js environment
      const loadingTask = pdfjsLib.getDocument({
        data: buffer,
        useSystemFonts: true,
        disableFontFace: true,
      });
      const doc = await loadingTask.promise;
      const numPages = doc.numPages;
      for (let i = 1; i <= numPages; i++) {
        try {
          const page = await doc.getPage(i);
          const textContent = await page.getTextContent();
          const text = textContent.items.map((it: any) => it.str).join(" ");
          pages.push({ pageNumber: i, text });
        } catch (e) {
          console.warn(`Failed to extract text from PDF page ${i}`, e);
          pages.push({ pageNumber: i, text: "" });
        }
      }
    } else if (fileExt === "epub") {
      return NextResponse.json(
        { error: "EPUB files should be processed directly on the client side via epub.js." },
        { status: 400 }
      );
    } else {
      // Fallback/raw text parser
      const rawText = buffer.toString("utf-8");
      paragraphs = rawText
        .split(/\n+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0);
    }

    if (paragraphs.length === 0 && pages.length === 0) {
      return NextResponse.json(
        { error: "No readable text content could be extracted from this document." },
        { status: 422 }
      );
    }

    return NextResponse.json({
      title,
      author,
      paragraphs,
      pages,
      totalPages: pages.length > 0 ? pages.length : undefined,
    });
  } catch (err) {
    console.error("Document parsing error:", err);
    return NextResponse.json(
      { error: "Parsing failed", details: (err as Error).message },
      { status: 500 }
    );
  }
}
