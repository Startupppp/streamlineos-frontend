"use client";

import { useEffect, useState } from "react";
import type { SanitizeHtmlPolicy } from "@/lib/sanitize-html";

export function useSanitizedHtml(
  html: string,
  policy?: SanitizeHtmlPolicy,
): string | null {
  const [sanitized, setSanitized] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/sanitize-html").then(
      ({ sanitizeHtml }) => {
        if (!cancelled) setSanitized(sanitizeHtml(html, policy));
      },
      (error: unknown) => {
        if (!cancelled) setLoadError(error);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [html, policy]);

  if (loadError !== null) throw loadError;
  return sanitized;
}
