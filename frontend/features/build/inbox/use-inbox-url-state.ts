"use client";

import { useCallback, useMemo, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { NotificationSection, NotificationCategory } from "@/types/notifications";
import { NOTIFICATION_CATEGORY_VALUES } from "@/types/notifications";
import { buildListSearchParams } from "../shared/use-build-list-url-state";

export type InboxView = "notifications" | "drafts";

const VALID_SECTIONS: readonly NotificationSection[] = [
  "UNREAD",
  "ALL",
  "MENTIONS",
];

const FILTER_PARAMS = ["q", "type", "project"] as const;

function parseSection(raw: string | null): NotificationSection {
  const match = VALID_SECTIONS.find((section) => section === raw);
  return match ?? "UNREAD";
}

export function isNotificationCategory(v: string): v is NotificationCategory {
  return NOTIFICATION_CATEGORY_VALUES.some((category) => category === v);
}

function parseType(raw: string | null): NotificationCategory | null {
  if (raw !== null && isNotificationCategory(raw)) return raw;
  return null;
}

function parseView(raw: string | null): InboxView {
  return raw === "drafts" ? "drafts" : "notifications";
}

function parseProjectId(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseCursor(raw: string | null): number | null {
  if (raw === null) return null;
  const parsed = Number(raw);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export interface InboxUrlState {
  view: InboxView;
  section: NotificationSection;
  q: string | null;
  type: NotificationCategory | null;
  projectId: number | null;
  cursor: number | null;
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
  const type = parseType(searchParams.get("type"));
  const projectId = parseProjectId(searchParams.get("project"));
  const cursor = parseCursor(searchParams.get("cursor"));

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
      const next = buildListSearchParams(searchParams, updates, {
        resetCursor: Object.keys(updates).some((key) => key !== "cursor"),
      });
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
    () => q !== null || type !== null || projectId !== null,
    [q, type, projectId],
  );

  return {
    view,
    section,
    q,
    type,
    projectId,
    cursor,
    hasActiveFilters,
    isPending,
    setParams,
    clearFilters,
  };
}
