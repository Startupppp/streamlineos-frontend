"use client";

import { useEffect, useRef } from "react";
import { hydrateDisplayOptions, writeDisplayOptionParams } from "./use-display-options";
import { parseViewType } from "./view-switcher";
import { currentSearchParams } from "@/lib/current-search-params";
import { BUILD_LIST_CURSOR_PARAM } from "../shared/use-build-list-url-state";
import type { DisplayOptions } from "@/features/build/shared/types";
import type { ProjectView } from "@/types/projects";
import type { useRouter, useSearchParams } from "next/navigation";

interface UseBoardViewApplyParams {
  viewId: string | null;
  views: { data: ProjectView[] } | undefined;
  isCalendarDeepLink: boolean;
  calendarHref: string;
  searchParams: ReturnType<typeof useSearchParams>;
  router: ReturnType<typeof useRouter>;
  setStoredDisplayOptions: (next: DisplayOptions) => void;
}

export function useBoardViewApply({
  viewId,
  views,
  isCalendarDeepLink,
  calendarHref,
  searchParams,
  router,
  setStoredDisplayOptions,
}: UseBoardViewApplyParams): void {
  const appliedViewIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isCalendarDeepLink) return;
    router.replace(calendarHref);
  }, [calendarHref, isCalendarDeepLink, router]);

  useEffect(() => {
    if (isCalendarDeepLink || !viewId || !views) return;
    if (appliedViewIdRef.current === viewId) return;
    const savedView = views.data.find((v) => v.id.toString() === viewId);
    if (!savedView) return;
    appliedViewIdRef.current = viewId;
    const next = currentSearchParams(searchParams);
    if (savedView.filters && typeof savedView.filters === "object") {
      for (const [k, val] of Object.entries(savedView.filters)) {
        if (typeof val === "string" && val) next.set(k, val);
        else next.delete(k);
      }
    }
    if (savedView.layoutType)
      next.set("view", parseViewType(savedView.layoutType));
    if (
      savedView.displayOptions &&
      typeof savedView.displayOptions === "object" &&
      Object.keys(savedView.displayOptions).length > 0
    ) {
      const hydrated = hydrateDisplayOptions(savedView.displayOptions);
      setStoredDisplayOptions(hydrated);
      writeDisplayOptionParams(next, hydrated);
    }
    next.delete(BUILD_LIST_CURSOR_PARAM);
    router.replace(`?${next.toString()}`, { scroll: false });
  }, [
    isCalendarDeepLink,
    viewId,
    views,
    searchParams,
    router,
    setStoredDisplayOptions,
  ]);
}
