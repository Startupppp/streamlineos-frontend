"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export interface ListUrlState {
  get: (key: string) => string;
  page: number;
  pageSize: number;
  setParams: (updates: Record<string, string | undefined>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
}

const DEFAULT_PAGE_SIZE = 20;

function parsePositiveInt(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) return fallback;
  return parsed;
}

export function useListUrlState(defaultPageSize: number = DEFAULT_PAGE_SIZE): ListUrlState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === undefined || value === "") params.delete(key);
        else params.set(key, value);
      }
      if (!("page" in updates)) params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback(
    (page: number) => setParams({ page: page > 1 ? String(page) : undefined }),
    [setParams],
  );

  const setPageSize = useCallback(
    (pageSize: number) => setParams({ pageSize: String(pageSize) }),
    [setParams],
  );

  const get = useCallback((key: string) => searchParams.get(key) ?? "", [searchParams]);

  return {
    get,
    page: parsePositiveInt(searchParams.get("page"), 1),
    pageSize: parsePositiveInt(searchParams.get("pageSize"), defaultPageSize),
    setParams,
    setPage,
    setPageSize,
  };
}
