"use client";

import { useCallback, useMemo, useState } from "react";

interface UseAllWorkCursorParams {
  cursor: string | null;
  nextCursor: string | null;
  setCursor: (cursor: string | null) => void;
}

export function useAllWorkCursor({
  cursor,
  nextCursor,
  setCursor,
}: UseAllWorkCursorParams) {
  const [storedTrail, setStoredTrail] = useState<(string | null)[]>([null]);

  const cursorTrail = useMemo(
    () =>
      storedTrail[storedTrail.length - 1] === cursor ? storedTrail : [cursor],
    [cursor, storedTrail],
  );

  const hasPrevious = cursorTrail.length > 1;
  const pageNumber = cursorTrail.length;

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    setStoredTrail([...cursorTrail, nextCursor]);
    setCursor(nextCursor);
  }, [cursorTrail, nextCursor, setCursor]);

  const handlePrev = useCallback(() => {
    if (cursorTrail.length <= 1) return;
    const newTrail = cursorTrail.slice(0, -1);
    setStoredTrail(newTrail);
    setCursor(newTrail[newTrail.length - 1] ?? null);
  }, [cursorTrail, setCursor]);

  const resetTrail = useCallback(() => {
    setStoredTrail([null]);
  }, []);

  return { hasPrevious, pageNumber, handleNext, handlePrev, resetTrail };
}
