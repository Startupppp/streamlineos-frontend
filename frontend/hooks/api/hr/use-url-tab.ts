"use client";

import { useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function useUrlTab<T extends string>(
  validTabs: readonly T[],
  defaultTab: T,
  param = "tab",
): { activeTab: T; onTabChange: (next: string) => void } {
  const router = useRouter();
  const searchParams = useSearchParams();
  const requested = searchParams.get(param);
  const activeTab =
    validTabs.find((candidate) => candidate === requested) ?? defaultTab;

  const onTabChange = useCallback(
    (next: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === defaultTab) params.delete(param);
      else params.set(param, next);
      const query = params.toString();
      router.replace(query ? `?${query}` : "?", { scroll: false });
    },
    [searchParams, router, defaultTab, param],
  );

  return { activeTab, onTabChange };
}
