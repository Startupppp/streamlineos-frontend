"use client";

import { useCallback, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

const FILTER_KEYS = ["q", "state", "permission"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export interface ClientAccessUrlState {
  q: string;
  state: string;
  permission: string;
  hasActiveFilters: boolean;
  setFilter: (key: FilterKey, value: string) => void;
  resetFilters: () => void;
}

export function useClientAccessUrlState(): ClientAccessUrlState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const q = searchParams.get("q") ?? "";
  const state = searchParams.get("state") ?? "";
  const permission = searchParams.get("permission") ?? "";

  const replaceWith = useCallback(
    (next: URLSearchParams) => {
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [pathname, router],
  );

  const setFilter = useCallback(
    (key: FilterKey, value: string) => {
      const next = new URLSearchParams(searchParams.toString());
      if (value) {
        next.set(key, value);
      } else {
        next.delete(key);
      }
      next.delete("cursor");
      replaceWith(next);
    },
    [replaceWith, searchParams],
  );

  const resetFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const key of FILTER_KEYS) next.delete(key);
    next.delete("cursor");
    replaceWith(next);
  }, [replaceWith, searchParams]);

  const hasActiveFilters = useMemo(
    () => FILTER_KEYS.some((key) => !!searchParams.get(key)),
    [searchParams],
  );

  return { q, state, permission, hasActiveFilters, setFilter, resetFilters };
}
