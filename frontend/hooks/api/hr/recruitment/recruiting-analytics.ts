"use client";

import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { RecruitingAnalytics } from "@/hooks/api/hr/recruitment/recruiting-analytics-schema";

export type { RecruitingAnalytics };

const analyticsC = lazyContract(() =>
  import("@/hooks/api/hr/recruitment/recruiting-analytics-schema").then(
    (m) => m.recruitingAnalyticsContract,
  ),
);

export interface AnalyticsWindow {
  from: string;
  to: string;
}

export function useRecruitingAnalytics(window: AnalyticsWindow) {
  return useGatedQuery("hr:requisitions:view", {
    queryKey: humanResourcesQueryKeys.hr.recruitingAnalytics(window.from, window.to),
    queryFn: ({ signal }) =>
      apiClient.get<RecruitingAnalytics>(
        "/hr/recruitment/analytics",
        { from: window.from, to: window.to },
        signal,
        analyticsC,
      ),
    staleTime: 5 * 60_000,
  });
}

/**
 * The URL a browser downloads the funnel from.
 *
 * Built here rather than fetched through `apiClient`, because the response is a
 * file rather than an envelope and the browser saves it better than any code
 * here could.
 */
export function funnelCsvUrl(window: AnalyticsWindow): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "";
  const query = new URLSearchParams({ from: window.from, to: window.to });
  return `${base}/hr/recruitment/analytics/funnel.csv?${query.toString()}`;
}
