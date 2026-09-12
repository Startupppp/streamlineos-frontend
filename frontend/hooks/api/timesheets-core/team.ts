"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useCan } from "@/hooks/api/access";
import type { TimesheetPeriod } from "@/features/timesheets/types";

const teamSummaryC = lazyContract(() =>
  import("@/hooks/api/timesheets-core/timesheets-team-schema").then((m) => m.teamSummaryResponseContract),
);

export interface TeamMemberWeekSummary {
  userId: string;
  name?: string | null;
  email?: string | null;
  period: TimesheetPeriod | null;
  dailyHours: Record<string, number>;
  totalHours: number;
}

interface TeamWeekSummaryResponse {
  summaries: TeamMemberWeekSummary[];
}

type TeamWeekSummaryParams = {
  userIds?: string;
  startDate: string;
  endDate: string;
};

export function useTeamWeekSummary(
  userIds: string[],
  startDate: string,
  endDate: string,
  enabled = true,
) {
  const canView = useCan("timesheets:team:view");
  const params: TeamWeekSummaryParams = {
    startDate,
    endDate,
    ...(userIds.length > 0 ? { userIds: userIds.join(",") } : {}),
  };
  return useQuery({
    queryKey: usersAndCommerceQueryKeys.timesheets.teamWeekSummary(params),
    queryFn: ({ signal }) =>
      apiClient.get<TeamWeekSummaryResponse>("/timesheets/team/week-summary", params, signal, teamSummaryC),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}
