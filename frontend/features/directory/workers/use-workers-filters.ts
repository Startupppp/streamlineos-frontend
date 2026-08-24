"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedValue } from "@/hooks/common/use-debounce";
import type { WorkerStatus } from "@/types/directory/workers";

export interface WorkersFilters {
  localSearch: string;
  search: string;
  status: WorkerStatus | "ALL";
  cursor: string | undefined;
  page: number;
  hasHistory: boolean;
  setSearch: (value: string) => void;
  setStatus: (value: WorkerStatus | "ALL") => void;
  pushCursor: (cursor: string | null) => void;
  popCursor: () => void;
}

const SEARCH_DEBOUNCE_MS = 300;

function parseStatus(raw: string | null): WorkerStatus | "ALL" {
  if (raw === "ACTIVE" || raw === "INACTIVE" || raw === "EXITED") return raw;
  return "ALL";
}

export function useWorkersFilters(): WorkersFilters {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const urlSearch = searchParams.get("q") ?? "";
  const status = parseStatus(searchParams.get("status"));

  const [localSearch, setLocalSearchState] = useState(urlSearch);
  const debouncedSearch = useDebouncedValue(localSearch, SEARCH_DEBOUNCE_MS);
  const prevDebounced = useRef(debouncedSearch);

  const [cursorHistory, setCursorHistory] = useState<(string | undefined)[]>([undefined]);

  const navigate = useCallback(
    (apply: (params: URLSearchParams) => void) => {
      startTransition(() => {
        const params = new URLSearchParams(searchParams.toString());
        apply(params);
        const qs = params.toString();
        router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
      });
    },
    [router, pathname, searchParams],
  );

  useEffect(() => {
    if (debouncedSearch === prevDebounced.current) return;
    prevDebounced.current = debouncedSearch;
    if (debouncedSearch === urlSearch) return;
    setCursorHistory([undefined]);
    navigate((params) => {
      if (debouncedSearch) params.set("q", debouncedSearch);
      else params.delete("q");
    });
  }, [debouncedSearch, urlSearch, navigate]);

  const setSearch = useCallback((value: string) => {
    setLocalSearchState(value);
  }, []);

  const setStatus = useCallback(
    (value: WorkerStatus | "ALL") => {
      setCursorHistory([undefined]);
      navigate((params) => {
        if (value === "ALL") params.delete("status");
        else params.set("status", value);
      });
    },
    [navigate],
  );

  const pushCursor = useCallback((cursor: string | null) => {
    setCursorHistory((prev) => [...prev, cursor ?? undefined]);
  }, []);

  const popCursor = useCallback(() => {
    setCursorHistory((prev) => prev.slice(0, -1));
  }, []);

  return {
    localSearch,
    search: debouncedSearch,
    status,
    cursor: cursorHistory.at(-1),
    page: cursorHistory.length,
    hasHistory: cursorHistory.length > 1,
    setSearch,
    setStatus,
    pushCursor,
    popCursor,
  };
}
