"use client";

import { useEffect, useState } from "react";

/**
 * A ceiling on how long one in-flight read may hold Home's first paint. The
 * transport's own ceiling is `REQUEST_TIMEOUT_MS` (30s) times the retry count,
 * which is an order of magnitude past the server's own per-section deadline, so
 * every Home gate that blocks the page needs a client-side one of its own.
 */
export function useSettleDeadline(ms: number): boolean {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), ms);
    return () => clearTimeout(timer);
  }, [ms]);
  return elapsed;
}
