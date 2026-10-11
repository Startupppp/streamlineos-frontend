"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useNavigationLeave } from "@/components/shared/dirty-state-context";

function appHref(href: string): string | null {
  if (!href.startsWith("/") || href.startsWith("//") || href.includes("\\")) return null;
  const target = new URL(href, window.location.origin);
  if (target.origin !== window.location.origin) return null;
  return `${target.pathname}${target.search}${target.hash}`;
}

export function useGuardedDocumentNavigation() {
  const requestLeave = useNavigationLeave();
  return useCallback(
    (href: string) => {
      const next = appHref(href);
      if (!next) return;
      requestLeave(() => window.location.assign(next));
    },
    [requestLeave],
  );
}

export function useGuardedSoftNavigation() {
  const requestLeave = useNavigationLeave();
  const router = useRouter();
  return useCallback(
    (href: string) => {
      const next = appHref(href);
      if (!next) return;
      requestLeave(() => router.push(next));
    },
    [requestLeave, router],
  );
}
