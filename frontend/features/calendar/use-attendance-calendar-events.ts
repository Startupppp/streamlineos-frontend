"use client";

import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { eachMonthOfInterval, format } from "date-fns";
import { useCan } from "@/hooks/api/access";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { useHrWfhRequests } from "@/hooks/api/hr";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { AttendanceLog } from "@/types/hr";

function toTimestamp(value: Date | string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function useAttendanceCalendarEvents(
  rangeStart: Date,
  rangeEnd: Date,
): CalendarListItem[] {
  const canViewAttendance = useCan("self:attendance");
  const { data: wfhRequests = [] } = useHrWfhRequests();
  const months = useMemo(
    () => eachMonthOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeEnd, rangeStart],
  );

  const queries = useQueries({
    queries: months.map((month) => {
      const params = {
        year: month.getFullYear(),
        month: month.getMonth(),
      };
      return {
        queryKey: queryKeys.hr.monthlyAttendance(params),
        queryFn: () =>
          apiClient.get<AttendanceLog[]>("/me/attendance/monthly", params),
        staleTime: 2 * 60_000,
        enabled: canViewAttendance,
      };
    }),
  });

  return useMemo(() => {
    const latestByDate = new Map<string, AttendanceLog>();
    const from = format(rangeStart, "yyyy-MM-dd");
    const to = format(rangeEnd, "yyyy-MM-dd");
    const approvedWfhByDate = new Map(
      wfhRequests
        .filter((request) => request.status === "APPROVED")
        .map((request) => {
          const date =
            typeof request.date === "string"
              ? request.date.slice(0, 10)
              : format(request.date, "yyyy-MM-dd");
          return [date, request] as const;
        })
        .filter(([date]) => date >= from && date <= to),
    );
    for (const query of queries) {
      for (const log of query.data ?? []) {
        const current = latestByDate.get(log.date);
        if (
          !current ||
          toTimestamp(log.createdAt) > toTimestamp(current.createdAt)
        ) {
          latestByDate.set(log.date, log);
        }
      }
    }

    return [...latestByDate.values()]
      .map((log) => {
        const hours = log.workHours ? Number.parseFloat(log.workHours) : 0;
        const isWfh = approvedWfhByDate.has(log.date);
        const day = new Date(`${log.date}T12:00:00`);
        const details = [
          isWfh ? "Work from home" : null,
          log.status === "ON_BREAK" ? "On break" : null,
          hours > 0 ? `${hours.toFixed(1)} hours recorded` : null,
          log.checkIn ? `Check-in ${format(new Date(log.checkIn), "p")}` : null,
          log.checkOut
            ? `Check-out ${format(new Date(log.checkOut), "p")}`
            : null,
        ].filter((value): value is string => Boolean(value));

        return {
          id: `attendance-self-${log.id}`,
          title: `Attendance${isWfh ? " - WFH" : ""}${
            hours > 0 ? ` - ${hours.toFixed(1)}h` : ""
          }`,
          start: day.toISOString(),
          end: day.toISOString(),
          allDay: true,
          color: "green",
          category: "attendance",
          source: "attendance" as const,
          description: details.join(" - ") || null,
        };
      })
      .concat(
      [...approvedWfhByDate.entries()]
        .filter(([date]) => !latestByDate.has(date))
        .map(([date, request]) => {
          const day = new Date(`${date}T12:00:00`);
          return {
            id: `attendance-self-wfh-${request.id}`,
            title: "Attendance - WFH",
            start: day.toISOString(),
            end: day.toISOString(),
            allDay: true,
            color: "green",
            category: "attendance",
            source: "attendance" as const,
            description: "Approved work-from-home day",
          };
        }),
      );
  }, [queries, rangeEnd, rangeStart, wfhRequests]);
}
