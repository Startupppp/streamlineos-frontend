"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useOnlineStatus } from "./use-online-status";

export const INBOX_OFFLINE_MESSAGE =
  "You're offline — reconnect to update your inbox.";

export interface RunWhenOnline {
  isOnline: boolean;
  /** Runs `run` when the browser is online, and says why it did not otherwise. */
  runWhenOnline: (run: () => void) => void;
}

/**
 * The guard `/inbox` had and `/notifications` did not.
 *
 * `use-notification-inbox.ts` fired all fourteen of its mutations regardless of
 * connectivity, underneath the offline banner that surface renders: every control —
 * mark read, archive, pin, snooze, delete, bulk delete, approve, reject — dispatched
 * a request that could not succeed, and the optimistic cache patch applied and then
 * rolled back, so the row visibly changed and changed back. The sibling surface,
 * which routes all eight of its mutations through this check, renders no banner.
 * Exactly inverted coverage, which is why the check lives here now instead of inside
 * one feature.
 *
 * A toast rather than a disabled control on purpose: `navigator.onLine` is a hint,
 * not a guarantee (it reports true behind a captive portal), so it is right to
 * explain a refusal and wrong to pre-emptively grey out a button that might work.
 */
export function useRunWhenOnline(): RunWhenOnline {
  const isOnline = useOnlineStatus();

  const runWhenOnline = useCallback(
    (run: () => void): void => {
      if (!isOnline) {
        toast.error(INBOX_OFFLINE_MESSAGE);
        return;
      }
      run();
    },
    [isOnline],
  );

  return { isOnline, runWhenOnline };
}
