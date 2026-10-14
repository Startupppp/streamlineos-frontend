"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  subDays,
} from "date-fns";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";

const hrCalendarEventListContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then(
    (m) => m.hrCalendarEventListContract,
  ),
);
import type { HrCalendarEvent } from "@/hooks/api/hr/hr-calendar";
import type { BigCalEvent } from "./big-calendar-wrapper";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useModuleEnabled, usePermissionGate } from "@/hooks/api/access";
import type { PermissionGate } from "@/lib/rbac/permission-gate";

export const HR_CALENDAR_MAX_WINDOW_DAYS = 62;
const HR_CALENDAR_HALF_WINDOW_DAYS = 30;

export function clampToHrCalendarWindow(
  rangeStart: Date,
  rangeEnd: Date,
): { from: Date; to: Date } {
  if (
    differenceInCalendarDays(rangeEnd, rangeStart) <=
    HR_CALENDAR_MAX_WINDOW_DAYS
  )
    return { from: rangeStart, to: rangeEnd };
  const midpoint = new Date((rangeStart.getTime() + rangeEnd.getTime()) / 2);
  return {
    from: subDays(midpoint, HR_CALENDAR_HALF_WINDOW_DAYS),
    to: addDays(midpoint, HR_CALENDAR_HALF_WINDOW_DAYS),
  };
}

export function splitHrCalendarWindow(
  rangeStart: Date,
  rangeEnd: Date,
): { from: string; to: string }[] {
  const finalDay = new Date(rangeEnd.getTime() - 1);
  if (finalDay < rangeStart) return [];
  const windows: { from: string; to: string }[] = [];
  let cursor = rangeStart;
  while (cursor <= finalDay) {
    const end = addDays(cursor, HR_CALENDAR_MAX_WINDOW_DAYS - 1);
    const to = end < finalDay ? end : finalDay;
    windows.push({ from: format(cursor, "yyyy-MM-dd"), to: format(to, "yyyy-MM-dd") });
    cursor = addDays(to, 1);
  }
  return windows;
}

const HR_TYPE_COLORS: Record<string, string> = {
  HOLIDAY: "#3b82f6",
  LEAVE: "#60a5fa",
  BIRTHDAY: "#93c5fd",
  ANNIVERSARY: "#bfdbfe",
  REVIEW_CYCLE: "#2563eb",
  TRAVEL: "#38bdf8",
  INTERVIEW: "#0284c7",
};
const HR_ACCESS_ERROR = new Error("HR calendar access could not be verified.");

export function parseHrCalendarDay(value: string): Date {
  return parseISO(value);
}

export function useHrCalendarEventsMapped(
  rangeStart: Date,
  rangeEnd: Date,
  hrVisible: boolean,
): {
  hrCalEvents: BigCalEvent[];
  hrEnabled: boolean;
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  access: PermissionGate;
  refetch: () => Promise<unknown>;
} {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const access = usePermissionGate("hr:helpdesk:view");
  const hrModuleEnabled = useModuleEnabled("hr");

  const windows = useMemo(
    () => splitHrCalendarWindow(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );

  const query = useQueries({
    queries: windows.map(({ from, to }) => ({
      queryKey: platformHierarchyQueryKeys.calendar.hrSupplemental(orgId, from, to),
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        apiClient.get<HrCalendarEvent[]>(
          "/hr/calendar",
          { from, to, types: "BIRTHDAY,ANNIVERSARY,REVIEW_CYCLE,TRAVEL" },
          signal,
          hrCalendarEventListContract,
        ),
      staleTime: 5 * 60_000,
      retry: (failureCount: number, error: unknown) =>
        (error as { status?: number } | null)?.status !== 403 && failureCount < 2,
      enabled: Boolean(orgId) && hrVisible && access.allowed && hrModuleEnabled,
      refetchOnWindowFocus: "always" as const,
      refetchOnReconnect: "always" as const,
    })),
    combine: (results: UseQueryResult<HrCalendarEvent[]>[]) => ({
      data: results.flatMap((result) => result.data ?? []),
      isLoading: results.some((result) => result.isLoading),
      isError: results.some((result) => result.isError),
      error: results.find((result) => result.isError)?.error ?? null,
      refetch: () => Promise.all(results.map((result) => result.refetch())),
    }),
  });

  const hrCalEvents = useMemo<BigCalEvent[]>(
    () =>
      (query.data ?? []).map((ev) => ({
        id: `hr-${ev.id}`,
        title: ev.title,
        start: parseHrCalendarDay(ev.date),
        end: parseHrCalendarDay(ev.endDate ?? ev.date),
        allDay: true,
        resource: {
          source: "hr",
          color: HR_TYPE_COLORS[ev.type] ?? "#3b82f6",
          hrEventType: ev.type,
        },
      })),
    [query.data],
  );

  return {
    hrCalEvents,
    hrEnabled: access.allowed && hrModuleEnabled,
    isLoading: hrVisible && (access.pending || query.isLoading),
    isError: hrVisible && (access.unavailable || query.isError),
    error: access.unavailable ? HR_ACCESS_ERROR : query.error,
    access,
    refetch: query.refetch,
  };
}
