"use client";

import { useCallback, useState } from "react";
import { TablePagination } from "@/components/ui/table-pagination";

interface GrantsPagerProps {
  cursor: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  isPending: boolean;
  rowCount: number;
  onCursorChange: (cursor: string | null) => void;
}

export function GrantsPager({
  cursor,
  nextCursor,
  hasMore,
  isPending,
  rowCount,
  onCursorChange,
}: GrantsPagerProps) {
  const [trail, setTrail] = useState<string[]>(cursor ? [cursor] : []);

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    setTrail((prev) => [...prev, nextCursor]);
    onCursorChange(nextCursor);
  }, [nextCursor, onCursorChange]);

  const handlePrevious = useCallback(() => {
    setTrail((prev) => {
      const next = prev.slice(0, -1);
      onCursorChange(next.at(-1) ?? null);
      return next;
    });
  }, [onCursorChange]);

  return (
    <TablePagination
      mode="cursor"
      rowCount={rowCount}
      pageNumber={trail.length + 1}
      hasMore={hasMore && nextCursor !== null}
      hasPrevious={trail.length > 0}
      onPrevious={handlePrevious}
      onNext={handleNext}
      disabled={isPending}
    />
  );
}
