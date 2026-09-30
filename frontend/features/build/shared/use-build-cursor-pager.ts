"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { CursorPager } from "@/components/ui/table-pagination";

export const BUILD_CURSOR_STACK_PARAM = "cursors";

function decodeStack(raw: string | null): (string | undefined)[] {
  if (!raw) return [undefined];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [undefined];
    const cursors = parsed.filter((entry): entry is string => typeof entry === "string");
    return [undefined, ...cursors];
  } catch {
    return [undefined];
  }
}

function encodeStack(stack: (string | undefined)[]): string | null {
  const cursors = stack.filter((entry): entry is string => entry !== undefined);
  return cursors.length === 0 ? null : JSON.stringify(cursors);
}

export function useBuildCursorPager(resetKey?: string): CursorPager {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const stack = useMemo(
    () => decodeStack(searchParams.get(BUILD_CURSOR_STACK_PARAM)),
    [searchParams],
  );

  const write = useCallback(
    (next: (string | undefined)[]) => {
      const params = new URLSearchParams(searchParams.toString());
      const encoded = encodeStack(next);
      if (encoded) params.set(BUILD_CURSOR_STACK_PARAM, encoded);
      else params.delete(BUILD_CURSOR_STACK_PARAM);
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams],
  );

  const [appliedKey, setAppliedKey] = useState(resetKey);
  if (appliedKey !== resetKey) {
    setAppliedKey(resetKey);
    if (stack.length > 1) write([undefined]);
  }

  const goNext = useCallback(
    (nextCursor: string | null | undefined) => {
      if (!nextCursor) return;
      write([...stack, nextCursor]);
    },
    [stack, write],
  );

  const goPrevious = useCallback(() => {
    if (stack.length > 1) write(stack.slice(0, -1));
  }, [stack, write]);

  const reset = useCallback(() => {
    if (stack.length > 1) write([undefined]);
  }, [stack, write]);

  return useMemo(
    () => ({
      cursor: stack[stack.length - 1],
      pageNumber: stack.length,
      hasPrevious: stack.length > 1,
      goNext,
      goPrevious,
      reset,
    }),
    [stack, goNext, goPrevious, reset],
  );
}
