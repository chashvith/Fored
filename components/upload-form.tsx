"use client";

import { useState } from "react";

export default function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    if (!file) {
      setMessage("Please choose a file to upload.");
      return;
    }
    if (!userId) {
      setMessage("Provide a userId (for testing). Later this will use auth.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("title", title);
      fd.append("author", author);
      fd.append("userId", userId);

      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setMessage(`Upload failed: ${data?.error || res.statusText}`);
      } else {
        setMessage("Upload successful.");
      }
    } catch (err) {
      setMessage((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-lg p-4 border rounded space-y-3">
      <div>
        <label className="block text-sm font-medium">File (EPUB or PDF)</label>
        <input
          type="file"
          accept=".pdf,.epub,application/epub+zip"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="mt-1"
        />
      </div>

      <div>
        <label className="block text-sm font-medium">Title (optional)</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium">Author (optional)</label>
        <input value={author} onChange={(e) => setAuthor(e.target.value)} className="mt-1 w-full" />
      </div>

      <div>
        <label className="block text-sm font-medium">User ID (temporary)</label>
        <input value={userId} onChange={(e) => setUserId(e.target.value)} className="mt-1 w-full" />
      </div>

      <div className="flex items-center space-x-2">
        <button type="submit" disabled={loading} className="px-3 py-1 bg-slate-800 text-white rounded">
          {loading ? "Uploading..." : "Upload"}
        </button>
        {message && <div className="text-sm text-slate-600">{message}</div>}
      </div>
    </form>
  );
}
