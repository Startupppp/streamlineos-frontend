"use client";

import { useCallback } from "react";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";

export function useGuardedDocumentNavigation() {
  const requestLeave = useNavigationLeave();
  return useCallback(
    (href: string) => {
      if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\"))
        return;
      const target = new URL(href, window.location.origin);
      if (target.origin !== window.location.origin) return;
      requestLeave(() =>
        window.location.assign(
          `${target.pathname}${target.search}${target.hash}`,
        ),
      );
    },
    [requestLeave],
  );
}
