"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { TimesheetPeriod } from "@/features/timesheets/types";

export interface TeamMemberWeekSummary {
  userId: string;
  period: TimesheetPeriod | null;
  dailyHours: Record<string, number>;
  totalHours: number;
}

interface TeamWeekSummaryResponse {
  summaries: TeamMemberWeekSummary[];
}

export function useTeamWeekSummary(
  userIds: string[],
  startDate: string,
  endDate: string,
  enabled = true,
) {
  const canView = useCan("timesheets:team:view");
  const params = { userIds: userIds.join(","), startDate, endDate };
  return useQuery({
    queryKey: queryKeys.timesheets.teamWeekSummary(params),
    queryFn: () =>
      apiClient.get<TeamWeekSummaryResponse>("/timesheets/team/week-summary", params),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView && userIds.length > 0,
  });
}
