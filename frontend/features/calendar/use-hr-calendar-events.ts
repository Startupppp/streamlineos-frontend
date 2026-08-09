"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiClient } from "@/lib/api-client";
import type { HrCalendarEvent } from "@/hooks/api/hr/hr-calendar";
import type { BigCalEvent } from "./big-calendar-wrapper";
import { useCalendarSourceVisibility } from "./use-calendar-source-visibility";
import { queryKeys } from "@/lib/query-keys";

export function useHrEventsVisible() {
  return useCalendarSourceVisibility("hrEvents", true);
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
): { hrCalEvents: BigCalEvent[]; hrEnabled: boolean } {
  const [forbidden, setForbidden] = useState(false);

  const from = format(rangeStart, "yyyy-MM-dd");
  const to = format(rangeEnd, "yyyy-MM-dd");

  const { data, isError, error } = useQuery({
    queryKey: queryKeys.calendar.hrSupplemental(from, to),
    queryFn: () =>
      apiClient.get<HrCalendarEvent[]>("/hr/calendar", {
        from,
        to,
        types: "BIRTHDAY,ANNIVERSARY,REVIEW_CYCLE,TRAVEL",
      }),
    staleTime: 5 * 60_000,
    retry: false,
    enabled: !forbidden,
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

  return { hrCalEvents, hrEnabled: !forbidden };
}
