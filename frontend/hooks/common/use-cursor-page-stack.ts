"use client";

import { useCallback, useState } from "react";

export interface CursorPageStack {
  cursor: string | undefined;
  page: number;
  hasPrevious: boolean;
  goToNextPage: (nextCursor: string | null | undefined) => void;
  goToPreviousPage: () => void;
  resetToFirstPage: () => void;
}

export function useCursorPageStack(): CursorPageStack {
  const [cursors, setCursors] = useState<(string | undefined)[]>([undefined]);
  const [pageIndex, setPageIndex] = useState(0);

  const goToNextPage = useCallback(
    (nextCursor: string | null | undefined) => {
      setCursors((current) => [
        ...current.slice(0, pageIndex + 1),
        nextCursor ?? undefined,
      ]);
      setPageIndex(pageIndex + 1);
    },
    [pageIndex],
  );

  const goToPreviousPage = useCallback(() => {
    setPageIndex((current) => Math.max(0, current - 1));
  }, []);

  const resetToFirstPage = useCallback(() => {
    setCursors([undefined]);
    setPageIndex(0);
  }, []);

  return {
    cursor: cursors[pageIndex],
    page: pageIndex + 1,
    hasPrevious: pageIndex > 0,
    goToNextPage,
    goToPreviousPage,
    resetToFirstPage,
  };
}
