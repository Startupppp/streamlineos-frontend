"use client";

import { useState } from "react";

/** Copies the canonical URL and announces the result to screen readers. */
export function CopyLink({ url }: { url: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("failed");
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button type="button" onClick={handleCopy} className="min-h-11 rounded-full border border-journal-rule px-4 text-sm text-journal-ink hover:bg-journal-sage">
        Copy link
      </button>
      <span role="status" aria-live="polite" className="text-sm text-journal-muted">
        {status === "copied" ? "Link copied" : status === "failed" ? "Copy failed — use your browser’s address bar" : ""}
      </span>
    </span>
  );
}
