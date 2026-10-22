"use client";

import { useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

export function useNavIntentPrefetch() {
  const router = useRouter();
  const prefetched = useRef(new Set<string>());

  return useCallback(
    (href: string) => {
      if (!href || href.startsWith("http") || prefetched.current.has(href)) {
        return;
      }
      prefetched.current.add(href);
      router.prefetch(href);
    },
    [router],
  );
}
