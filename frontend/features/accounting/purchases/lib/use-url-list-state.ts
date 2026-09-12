"use client";

import { useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export function useUrlListState() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const getParam = useCallback(
    (key: string) => searchParams.get(key) ?? "",
    [searchParams],
  );

  const setParams = useCallback(
    (updates: Record<string, string | undefined>, keepPage = false) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      if (!keepPage) params.delete("page");
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const parsedPage = Number(searchParams.get("page") ?? "1");
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const setPage = useCallback(
    (next: number) => setParams({ page: next > 1 ? String(next) : undefined }, true),
    [setParams],
  );

  return { getParam, setParams, page, setPage };
}
