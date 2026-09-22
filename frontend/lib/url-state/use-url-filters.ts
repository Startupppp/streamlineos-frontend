"use client";

import { useCallback, useTransition } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

export type UrlFilterUpdates = Record<string, string | null>;

export interface UseUrlFiltersOptions {
  pageParam?: string;
}

export interface UseUrlFiltersReturn {
  update: (updates: UrlFilterUpdates) => void;
  isPending: boolean;
}

export function parseEnum<T extends readonly string[]>(
  value: string | null,
  tuple: T,
  fallback: T[number],
): T[number] {
  return tuple.find((candidate) => candidate === value) ?? fallback;
}

export function useUrlFilters(options: UseUrlFiltersOptions = {}): UseUrlFiltersReturn {
  const { pageParam } = options;
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const update = useCallback(
    (updates: UrlFilterUpdates) => {
      const params = new URLSearchParams(searchParams.toString());
      const effective: UrlFilterUpdates =
        pageParam !== undefined && !(pageParam in updates)
          ? { [pageParam]: null, ...updates }
          : updates;
      for (const [key, value] of Object.entries(effective)) {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      }
      startTransition(() => {
        router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      });
    },
    [searchParams, router, pathname, pageParam],
  );

  return { update, isPending };
}
