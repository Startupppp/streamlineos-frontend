"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { useCan } from "@/hooks/api/access";

const scorecardAnalyticsC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/scorecard-analytics-schema").then(
    (m) => m.scorecardAnalyticsContract,
  ),
);

export interface InterviewerStat {
  interviewerId: string;
  name: string | null;
  email: string;
  totalScorecards: number;
  avgRating: number;
  recommendations: Record<string, number>;
  hireRate: number;
  hiresAfterPositive: number;
  positiveScorecards: number;
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
        scorecardAnalyticsC,
      ),
    staleTime: 5 * 60_000,
    enabled: can,
  });
}
