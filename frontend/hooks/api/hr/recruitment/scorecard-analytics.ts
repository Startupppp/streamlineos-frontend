"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

export interface InterviewerStat {
  interviewerId: string;
  name: string | null;
  email: string;
  totalScorecards: number;
  avgRating: number;
  recommendations: Record<string, number>;
  hireRate: number;
}

export interface ScorecardAnalytics {
  interviewerStats: InterviewerStat[];
  orgAvgRating: number;
  totalScorecards: number;
  scoreDistribution: { range: string; count: number }[];
  period: { days: number; since: string };
}

export function useScorecardAnalytics(params: { days: string }) {
  const can = useCan("hr:interviews:view");
  return useQuery({
    queryKey: humanResourcesQueryKeys.hr.scorecardAnalytics({ days: params.days }),
    queryFn: ({ signal }) =>
      apiClient.get<ScorecardAnalytics>(
        `/hr/recruitment/scorecard-analytics?days=${params.days}`,
        undefined,
        signal,
      ),
    staleTime: 5 * 60_000,
    enabled: can,
  });
}
