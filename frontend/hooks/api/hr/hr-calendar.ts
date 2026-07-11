"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const HR_CALENDAR_EVENT_TYPES = [
  "HOLIDAY",
  "LEAVE",
  "BIRTHDAY",
  "ANNIVERSARY",
  "REVIEW_CYCLE",
  "TRAINING",
  "TRAVEL",
  "INTERVIEW",
] as const;

export type HrCalendarEventType = (typeof HR_CALENDAR_EVENT_TYPES)[number];

export const HR_CALENDAR_TYPE_LABELS: Record<HrCalendarEventType, string> = {
  HOLIDAY: "Holiday",
  LEAVE: "Leave",
  BIRTHDAY: "Birthday",
  ANNIVERSARY: "Anniversary",
  REVIEW_CYCLE: "Review Cycle",
  TRAINING: "Training",
  TRAVEL: "Travel",
  INTERVIEW: "Interview",
};

export const HR_CALENDAR_TYPE_COLORS: Record<HrCalendarEventType, string> = {
  HOLIDAY: "bg-blue-100 text-blue-700 border-blue-200",
  LEAVE: "bg-amber-100 text-amber-700 border-amber-200",
  BIRTHDAY: "bg-pink-100 text-pink-700 border-pink-200",
  ANNIVERSARY: "bg-purple-100 text-purple-700 border-purple-200",
  REVIEW_CYCLE: "bg-indigo-100 text-indigo-700 border-indigo-200",
  TRAINING: "bg-green-100 text-green-700 border-green-200",
  TRAVEL: "bg-orange-100 text-orange-700 border-orange-200",
  INTERVIEW: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

export interface HrCalendarEvent {
  id: string;
  type: HrCalendarEventType;
  title: string;
  date: string;
  endDate?: string;
  meta?: Record<string, unknown>;
}

export function useHrCalendar(params: {
  from: string;
  to: string;
  types?: HrCalendarEventType[];
}) {
  const types = params.types?.join(",");
  return useQuery({
    queryKey: ["hr", "calendar", params.from, params.to, types],
    queryFn: () =>
      apiClient.get<HrCalendarEvent[]>("/hr/calendar", {
        from: params.from,
        to: params.to,
        ...(types ? { types } : {}),
      }),
    staleTime: 5 * 60_000,
    enabled: Boolean(params.from && params.to),
  });
}
