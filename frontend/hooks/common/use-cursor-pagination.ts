"use client";

import { useCallback, useState } from "react";

export interface CursorPaginationState {
  cursor: string | undefined;
  pageNumber: number;
  hasPrevious: boolean;
  goNext: (nextCursor: string | null | undefined) => void;
  goPrevious: () => void;
  reset: () => void;
}

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
