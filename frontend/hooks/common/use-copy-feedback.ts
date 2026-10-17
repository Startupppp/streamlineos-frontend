"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { writeToClipboard } from "@/lib/clipboard";

const COPY_FEEDBACK_RESET_MS = 2000;

export function useCopyFeedback(resetMs: number = COPY_FEEDBACK_RESET_MS) {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      const ok = await writeToClipboard(text);
      if (!ok) return false;
      if (timerRef.current !== null) clearTimeout(timerRef.current);
      setCopied(true);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        setCopied(false);
      }, resetMs);
      return true;
    },
    [resetMs],
  );

  return { copied, copy };
}
