"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { ReportOverview } from "@/features/timesheets-core/types";

interface OverviewQuery {
  startDate?: string;
  endDate?: string;
  userId?: string;
}

export function useReportsOverview(query: OverviewQuery = {}, enabled = true) {
  const canView = useCan("timesheets:reports:view");
  const params = { startDate: query.startDate, endDate: query.endDate, userId: query.userId };
  return useQuery({
    queryKey: queryKeys.timesheets.reportsOverview(params),
    queryFn: () => apiClient.get<ReportOverview>("/timesheets/reports/overview", params),
    staleTime: 60_000,
    placeholderData: (prev) => prev,
    enabled: enabled && canView,
  });
}
