"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { NotificationSection } from "@/types/notifications";

export type InboxView = "notifications" | "drafts";

const VALID_SECTIONS: ReadonlySet<string> = new Set([
  "UNREAD",
  "ALL",
  "MENTIONS",
]);

const FILTER_PARAMS = ["q", "type"] as const;

function parseSection(raw: string | null): NotificationSection {
  if (raw && VALID_SECTIONS.has(raw)) return raw as NotificationSection;
  return "UNREAD";
}

function parseView(raw: string | null): InboxView {
  return raw === "drafts" ? "drafts" : "notifications";
}

export interface InboxUrlState {
  view: InboxView;
  section: NotificationSection;
  q: string | null;
  type: string | null;
  cursor: string | null;
  hasActiveFilters: boolean;
  isPending: boolean;
  setParams: (updates: Record<string, string | null>) => void;
  clearFilters: () => void;
}

export function useInboxUrlState(): InboxUrlState {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const view = parseView(searchParams.get("view"));
  const section = parseSection(searchParams.get("section"));
  const q = searchParams.get("q");
  const type = searchParams.get("type");
  const cursor = searchParams.get("cursor");

  const replaceWith = useCallback(
    (next: URLSearchParams) => {
      startTransition(() => {
        const query = next.toString();
        router.replace(query ? `${pathname}?${query}` : pathname, {
          scroll: false,
        });
      });
    },
    [pathname, router],
  );

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") {
          next.delete(key);
        } else {
          next.set(key, value);
        }
      }
      const filterChanged = Object.keys(updates).some((key) => key !== "cursor");
      if (filterChanged) next.delete("cursor");
      replaceWith(next);
    },
    [replaceWith, searchParams],
  );

  const clearFilters = useCallback(() => {
    const next = new URLSearchParams(searchParams.toString());
    for (const param of FILTER_PARAMS) next.delete(param);
    next.delete("cursor");
    replaceWith(next);
  }, [replaceWith, searchParams]);

  const hasActiveFilters = useMemo(
    () => FILTER_PARAMS.some((param) => !!searchParams.get(param)),
    [searchParams],
  );

  return {
    view,
    section,
    q,
    type,
    cursor,
    hasActiveFilters,
    isPending,
    setParams,
    clearFilters,
  };
}
