"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { collaborationQueryKeys } from "@/lib/query-keys/collaboration";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const ATTENDANCE_DAY_QUERY_KEYS = {
  status: () => humanResourcesQueryKeys.hr.attendanceStatus(),
  history: () => [...humanResourcesQueryKeys.hr.all, "attendanceHistory"] as const,
  monthly: () => [...humanResourcesQueryKeys.hr.all, "monthlyAttendance"] as const,
  teamStatusMarker: "team-attendance-status",
  dashboardTeam: () => collaborationQueryKeys.dashboard.teamAttendance(),
} as const;

export function useInvalidateAttendanceDay() {
  const queryClient = useQueryClient();
  return useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: ATTENDANCE_DAY_QUERY_KEYS.status(),
      exact: true,
    });
    void queryClient.invalidateQueries({
      queryKey: ATTENDANCE_DAY_QUERY_KEYS.history(),
    });
    void queryClient.invalidateQueries({
      queryKey: ATTENDANCE_DAY_QUERY_KEYS.monthly(),
    });
    void queryClient.invalidateQueries({
      queryKey: ATTENDANCE_DAY_QUERY_KEYS.dashboardTeam(),
      exact: true,
    });
    void queryClient.invalidateQueries({
      predicate: (query) =>
        query.queryKey.includes(ATTENDANCE_DAY_QUERY_KEYS.teamStatusMarker),
    });
  }, [queryClient]);
}
