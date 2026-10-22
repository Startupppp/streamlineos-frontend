"use client";

import { useEffect, useState } from "react";

export const DEFAULT_STALLED_AFTER_MS = 20_000;

export const PANEL_STALLED_AFTER_MS = 10_000;

export function useStalledAfter(active: boolean, afterMs: number): boolean {
  const [stalled, setStalled] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setStalled(true), afterMs);
    return () => {
      clearTimeout(timer);
      setStalled(false);
    };
  }, [active, afterMs]);

  return stalled;
}
