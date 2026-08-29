"use client";

import { useCallback, useState } from "react";

export interface CursorPaginationState {
  /** Send this to the API. `undefined` is the first page. */
  cursor: string | undefined;
  /** Position in the walk, 1-based. There is no page count to compare it to. */
  pageNumber: number;
  hasPrevious: boolean;
  /** Advance using the `nextCursor` the last response carried. */
  goNext: (nextCursor: string | null | undefined) => void;
  goPrevious: () => void;
  /** Back to the first page — every filter change owes this. */
  reset: () => void;
}

/**
 * The client half of keyset pagination.
 *
 * A cursor names one boundary, so the server can only ever answer "what comes
 * after this". Going back is therefore the caller's problem, and the answer is
 * the trail of cursors already used: index 0 is the first page (no cursor), and
 * each subsequent entry is the `nextCursor` that opened the page above it.
 * Keeping the trail rather than a page number is what makes Back exact — it
 * re-asks the same question, not "page 3", which on a list still being written
 * to would be a different set of rows by the time it is asked again.
 *
 * A filter change invalidates every boundary in the trail, so it must `reset()`;
 * that is the same obligation a page-based list has to return to page 1 (§9),
 * and here it is a correctness rule rather than a courtesy — a cursor cut from
 * one filter's ordering is meaningless under another's.
 */
export function useCursorPagination(): CursorPaginationState {
  const [trail, setTrail] = useState<(string | undefined)[]>([undefined]);

  const goNext = useCallback((nextCursor: string | null | undefined) => {
    if (!nextCursor) return;
    setTrail((current) => [...current, nextCursor]);
  }, []);

  const goPrevious = useCallback(() => {
    setTrail((current) => (current.length > 1 ? current.slice(0, -1) : current));
  }, []);

  const reset = useCallback(() => {
    setTrail((current) => (current.length === 1 ? current : [undefined]));
  }, []);

  return {
    cursor: trail[trail.length - 1],
    pageNumber: trail.length,
    hasPrevious: trail.length > 1,
    goNext,
    goPrevious,
    reset,
  };
}
