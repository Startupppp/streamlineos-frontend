"use client";

import { useCallback, useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { eachMonthOfInterval, format } from "date-fns";
import { usePermissionGate } from "@/hooks/api/access";
import type { CalendarListItem } from "@/hooks/api/calendar";
import { useHrWfhRequests } from "@/hooks/api/hr";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import type { PermissionGate } from "@/lib/rbac/permission-gate";

const attendanceLogListContract = lazyContract(() =>
  import("@/hooks/api/calendar-schema").then((m) => m.attendanceLogListContract),
);
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { AttendanceLog, WfhRequest } from "@/types/hr";

const NO_WFH_REQUESTS: readonly WfhRequest[] = Object.freeze([]);
const ATTENDANCE_ACCESS_ERROR = new Error("Attendance access could not be verified.");

interface AttendancePagesResult {
  pages: (AttendanceLog[] | undefined)[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  refetch: () => Promise<void>;
}

export interface AttendanceCalendarEventsResult {
  events: CalendarListItem[];
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  access: PermissionGate;
  refetch: () => Promise<void>;
}

function toTimestamp(value: Date | string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

export function useAttendanceCalendarEvents(
  rangeStart: Date,
  rangeEnd: Date,
  attendanceVisible: boolean,
): AttendanceCalendarEventsResult {
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  const access = usePermissionGate("self:attendance");
  const wfhQuery = useHrWfhRequests({ enabled: attendanceVisible });
  const wfhRequests = wfhQuery.data ?? NO_WFH_REQUESTS;
  const months = useMemo(
    () => eachMonthOfInterval({ start: rangeStart, end: rangeEnd }),
    [rangeEnd, rangeStart],
  );

  const combineAttendance = useCallback(
    (results: UseQueryResult<AttendanceLog[]>[]): AttendancePagesResult => ({
      pages: results.map((result) => result.data),
      isLoading: results.some((result) => result.isLoading),
      isError: results.some((result) => result.isError),
      error: results.find((result) => result.isError)?.error ?? null,
      refetch: async () => {
        await Promise.all(results.map((result) => result.refetch()));
      },
    }),
    [],
  );

  const attendance = useQueries({
    combine: combineAttendance,
    queries: months.map((month) => {
      const params = {
        orgId,
        actorUserId: userId,
        year: month.getFullYear(),
        month: month.getMonth(),
      };
      return {
        queryKey: humanResourcesQueryKeys.hr.monthlyAttendance(params),
        queryFn: ({ signal }) =>
          apiClient.get<AttendanceLog[]>("/me/attendance/monthly", {
            year: params.year,
            month: params.month,
          }, signal, attendanceLogListContract),
        staleTime: 2 * 60_000,
        enabled: Boolean(orgId && userId) && access.allowed && attendanceVisible,
        refetchOnWindowFocus: "always" as const,
        refetchOnReconnect: "always" as const,
      };
    }),
  });

  const events = useMemo(() => {
    const logsByDate = new Map<string, AttendanceLog[]>();
    const from = format(rangeStart, "yyyy-MM-dd");
    const to = format(rangeEnd, "yyyy-MM-dd");
    const today = format(new Date(), "yyyy-MM-dd");
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
    for (const page of attendance.pages) {
      for (const log of page ?? []) {
        const logs = logsByDate.get(log.date) ?? [];
        logs.push(log);
        logsByDate.set(log.date, logs);
      }
    }

    return [...logsByDate.entries()]
      .map(([date, logs]) => {
        const latest = logs.reduce((current, log) =>
          toTimestamp(log.createdAt) > toTimestamp(current.createdAt)
            ? log
            : current,
        );
        const hours = logs.reduce(
          (total, log) =>
            total +
            Math.max(
              0,
              Number(log.workHours ?? 0) - Number(log.breakHours ?? 0),
            ),
          0,
        );
        const statuses = new Set(
          logs.map((log) => log.status?.toUpperCase()).filter(Boolean),
        );
        const hasOpenSession = logs.some((log) => !log.checkOut);
        const firstCheckIn = logs
          .map((log) => log.checkIn)
          .filter((value): value is Date | string => value !== null)
          .reduce<Date | string | null>(
            (earliest, value) =>
              !earliest || new Date(value) < new Date(earliest)
                ? value
                : earliest,
            null,
          );
        const lastCheckOut = logs
          .map((log) => log.checkOut)
          .filter((value): value is Date | string => value !== null)
          .reduce<Date | string | null>(
            (latestValue, value) =>
              !latestValue || new Date(value) > new Date(latestValue)
                ? value
                : latestValue,
            null,
          );
        const isPast = date < today;
        const status = statuses.has("ABSENT")
          ? "Absent"
          : statuses.has("HALF_DAY")
            ? "Half day"
            : statuses.has("LATE")
              ? "Late"
              : hasOpenSession && isPast
                ? "Missing checkout"
                : "Present";
        const isWfh = approvedWfhByDate.has(date) || statuses.has("WFH");
        const day = new Date(`${date}T12:00:00`);
        const details = [
          isWfh ? "Work from home" : null,
          statuses.has("ON_BREAK") ? "Currently on break" : null,
          hours > 0 ? `${hours.toFixed(1)} hours recorded` : null,
          firstCheckIn
            ? `Check-in ${format(new Date(firstCheckIn), "p")}`
            : null,
          lastCheckOut
            ? `Check-out ${format(new Date(lastCheckOut), "p")}`
            : null,
        ].filter((value): value is string => Boolean(value));

        return {
          id: `attendance-self-${latest.id}`,
          title: `${isWfh ? "WFH" : "Attendance"} - ${status}${
            hours > 0 ? ` - ${hours.toFixed(1)}h` : ""
          }`,
          start: day.toISOString(),
          end: day.toISOString(),
          allDay: true,
          color:
            status === "Absent"
              ? "red"
              : status === "Half day" ||
                  status === "Late" ||
                  status === "Missing checkout"
                ? "yellow"
                : isWfh
                  ? "blue"
                  : "green",
          category: "attendance",
          source: "attendance" as const,
          description: details.join(" - ") || null,
          sourceKey: "hr-attendance",
          sourceRecordId: String(latest.id),
          occurrenceId: `attendance-self-${latest.id}`,
          status: status.toUpperCase().replaceAll(" ", "_"),
          timeKind: "date" as const,
          time: { kind: "date" as const, startDate: date, endDate: date },
          availability: "free" as const,
          sourceVersion: null,
          actions: { view: true, edit: false, delete: false, rsvp: false, complete: false },
          freshness: { state: "fresh" as const, asOf: new Date().toISOString() },
        };
      })
      .concat(
        [...approvedWfhByDate.entries()]
          .filter(([date]) => !logsByDate.has(date))
          .map(([date, request]) => {
            const day = new Date(`${date}T12:00:00`);
            return {
              id: `attendance-self-wfh-${request.id}`,
              title: "WFH approved",
              start: day.toISOString(),
              end: day.toISOString(),
              allDay: true,
              color: "blue",
              category: "attendance",
              source: "attendance" as const,
              description: "Approved work-from-home day",
              sourceKey: "hr-attendance",
              sourceRecordId: String(request.id),
              occurrenceId: `attendance-self-wfh-${request.id}`,
              status: "APPROVED",
              timeKind: "date" as const,
              time: { kind: "date" as const, startDate: date, endDate: date },
              availability: "free" as const,
              sourceVersion: null,
              actions: { view: true, edit: false, delete: false, rsvp: false, complete: false },
              freshness: { state: "fresh" as const, asOf: new Date().toISOString() },
            };
          }),
      );
  }, [attendance.pages, rangeEnd, rangeStart, wfhRequests]);

  const refetchAttendance = attendance.refetch;
  const refetchWfh = wfhQuery.refetch;
  const refetch = useCallback(async () => {
    await Promise.all([refetchAttendance(), refetchWfh()]);
  }, [refetchAttendance, refetchWfh]);

  return useMemo(() => ({
    events,
    isLoading: attendanceVisible && (
      access.pending ||
      (access.allowed && (attendance.isLoading || wfhQuery.isLoading))
    ),
    isError: attendanceVisible && (
      access.unavailable || attendance.isError || wfhQuery.isError
    ),
    error: access.unavailable
      ? ATTENDANCE_ACCESS_ERROR
      : attendance.error ?? wfhQuery.error ?? null,
    access,
    refetch,
  }), [
    access,
    attendance.error,
    attendance.isError,
    attendance.isLoading,
    attendanceVisible,
    events,
    refetch,
    wfhQuery.error,
    wfhQuery.isError,
    wfhQuery.isLoading,
  ]);
}
