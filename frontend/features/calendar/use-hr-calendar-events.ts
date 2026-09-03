"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDays, differenceInCalendarDays, format, subDays } from "date-fns";
import { apiClient } from "@/lib/api-client";
import type { HrCalendarEvent } from "@/hooks/api/hr/hr-calendar";
import type { BigCalEvent } from "./big-calendar-wrapper";
import { useCalendarSourceVisibility } from "./use-calendar-source-visibility";
import { queryKeys } from "@/lib/query-keys";
import { useCan, useModuleEnabled } from "@/hooks/api/access";

export function useHrEventsVisible() {
  return useCalendarSourceVisibility("hrEvents", true);
}

/**
 * `/hr/calendar` refuses a window wider than 62 days, and the calendar view asks
 * every source for three whole months — up to 92 days. That is deliberate for
 * `/calendar/events`, whose own limit is 120 and whose backend spec pins the
 * three-month worst case, so the window that has to give is this one, not the
 * shared one and not the cap.
 *
 * Half-windows of 30 days keep the request at 60, two days under the cap so a
 * DST shift cannot round it over, and still reach at least a week past the
 * widest six-week month grid the view can render in either week-start
 * convention — `hr-calendar-window.test.ts` derives both bounds.
 */
export const HR_CALENDAR_MAX_WINDOW_DAYS = 62;
const HR_CALENDAR_HALF_WINDOW_DAYS = 30;

export function clampToHrCalendarWindow(
  rangeStart: Date,
  rangeEnd: Date,
): { from: Date; to: Date } {
  if (differenceInCalendarDays(rangeEnd, rangeStart) <= HR_CALENDAR_MAX_WINDOW_DAYS)
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

export function useHrCalendarEventsMapped(
  rangeStart: Date,
  rangeEnd: Date,
  hrVisible: boolean,
): { hrCalEvents: BigCalEvent[]; hrEnabled: boolean } {
  const [forbidden, setForbidden] = useState(false);
  const canView = useCan("hr:helpdesk:view");
  const hrModuleEnabled = useModuleEnabled("hr");

  const window = useMemo(
    () => clampToHrCalendarWindow(rangeStart, rangeEnd),
    [rangeStart, rangeEnd],
  );
  const from = format(window.from, "yyyy-MM-dd");
  const to = format(window.to, "yyyy-MM-dd");

  const { data, isError, error } = useQuery({
    queryKey: queryKeys.calendar.hrSupplemental(from, to),
    queryFn: ({ signal }) =>
      apiClient.get<HrCalendarEvent[]>("/hr/calendar", {
        from,
        to,
        types: "BIRTHDAY,ANNIVERSARY,REVIEW_CYCLE,TRAVEL",
      }, signal),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: !forbidden && hrVisible && canView && hrModuleEnabled,
  });

  useEffect(() => {
    if (isError) {
      const status = (error as { status?: number } | null)?.status;
      if (status === 403) {
        setForbidden(true);
      }
    }
  }, [isError, error]);

  const hrCalEvents: BigCalEvent[] = (data ?? []).map((ev) => ({
    id: `hr-${ev.id}`,
    title: ev.title,
    start: new Date(ev.date),
    end: new Date(ev.endDate ?? ev.date),
    allDay: true,
    resource: {
      source: "hr",
      color: HR_TYPE_COLORS[ev.type] ?? "#3b82f6",
      hrEventType: ev.type,
    },
  }));

  return { hrCalEvents, hrEnabled: !forbidden && canView && hrModuleEnabled };
}
