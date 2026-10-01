"use client";

import { useEffect, useState } from "react";

/** What the shell waits before it stops claiming to be loading. */
export const DEFAULT_STALLED_AFTER_MS = 20_000;

/**
 * What a panel waits, which is not what the whole shell waits.
 *
 * `apiClient`'s deadline is 30s (`REQUEST_TIMEOUT_MS`) and the query client
 * retries once with a 1s backoff, so a read against an unreachable API can sit in
 * `isPending` for about 61 seconds before `isError` can turn true. Nothing in a
 * skeleton distinguishes "slow" from "never": the 2026-10-01 chat E2E waited 25s
 * twice, hard-refreshed — resetting the clock — and filed three MEDIUM tickets for
 * "infinite skeleton" against three surfaces whose error branches were all correct
 * and simply out of reach. Ten seconds is long enough that an ordinarily slow read
 * never trips it and short enough that nobody studies a skeleton for a minute.
 */
export const PANEL_STALLED_AFTER_MS = 10_000;

/**
 * True once `active` has been continuously true for `afterMs`.
 *
 * The timer restarts whenever `active` goes false, so a refetch that succeeds
 * clears the stall and the next slow read is judged on its own.
 */
export function useStalledAfter(active: boolean, afterMs: number): boolean {
  const [stalled, setStalled] = useState(false);

  // The reset lives in the cleanup rather than the effect body: an effect that
  // calls setState on its way in is a render the component did not need
  // (react-hooks/set-state-in-effect), and the cleanup already runs on exactly the
  // transitions that should clear a stall — `active` going false, and unmount.
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
