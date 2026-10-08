"use client";

import { useCallback, useEffect, useMemo, useRef, useTransition } from "react";
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

export function useBuildCursorPager(resetKey?: string, cursorParam = BUILD_CURSOR_STACK_PARAM): CursorPager {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const stack = useMemo(
    () => decodeStack(searchParams.get(cursorParam)),
    [searchParams, cursorParam],
  );

  const write = useCallback(
    (next: (string | undefined)[]) => {
      const params = new URLSearchParams(searchParams.toString());
      const encoded = encodeStack(next);
      if (encoded) params.set(cursorParam, encoded);
      else params.delete(cursorParam);
      const query = params.toString();
      startTransition(() => {
        router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
      });
    },
    [pathname, router, searchParams, cursorParam],
  );

  const prevKeyRef = useRef(resetKey);
  useEffect(() => {
    if (prevKeyRef.current !== resetKey) {
      prevKeyRef.current = resetKey;
      if (stack.length > 1) write([undefined]);
    }
  }, [resetKey, stack, write]);

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
