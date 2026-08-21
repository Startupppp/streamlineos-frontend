"use client";

import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { OrgChartCursorPage, OrgChartQuery } from "./types";

function toRequestParams(params: OrgChartQuery): Record<string, unknown> {
  return {
    ...(params.parentId ? { parentId: params.parentId } : {}),
    ...(params.search ? { search: params.search } : {}),
    ...(params.cursor ? { cursor: params.cursor } : {}),
    ...(params.limit !== undefined ? { limit: params.limit } : {}),
  };
}

export function useHrOrgChart(
  params: OrgChartQuery = {},
  options?: { enabled?: boolean },
) {
  const canView = useCan("hr:employees:view");
  const { data: session } = useSession();
  const orgId = session?.orgId ?? "";
  const userId = session?.user?.id ?? "";
  const requestParams = toRequestParams(params);

  return useQuery({
    queryKey: [...queryKeys.hr.orgChart(), orgId, userId, requestParams] as const,
    queryFn: (): Promise<OrgChartCursorPage> =>
      apiClient.get<OrgChartCursorPage>("/hr/org-chart", requestParams),
    staleTime: 2 * 60_000,
    enabled: !!orgId && !!userId && canView && (options?.enabled ?? true),
  });
}
