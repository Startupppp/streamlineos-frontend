"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
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

  const window = useMemo(
    () => clampToHrCalendarWindow(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );
  const from = format(window.from, "yyyy-MM-dd");
  const to = format(window.to, "yyyy-MM-dd");

  const query = useQuery({
    queryKey: platformHierarchyQueryKeys.calendar.hrSupplemental(
      orgId,
      from,
      to,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<HrCalendarEvent[]>(
        "/hr/calendar",
        {
          from,
          to,
          types: "BIRTHDAY,ANNIVERSARY,REVIEW_CYCLE,TRAVEL",
        },
        signal,
        hrCalendarEventListContract,
      ),
    staleTime: 5 * 60_000,
    retry: (failureCount, error) =>
      (error as { status?: number } | null)?.status !== 403 && failureCount < 2,
    enabled: Boolean(orgId) && hrVisible && access.allowed && hrModuleEnabled,
    refetchOnWindowFocus: "always",
    refetchOnReconnect: "always",
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
