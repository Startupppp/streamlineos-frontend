import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const compCyclesQueryOptions = (params?: Record<string, unknown>) => ({
  queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCompCyclesAll, params],
  staleTime: 2 * 60_000,
});

export const equityGrantsQueryOptions = (params?: Record<string, unknown>) => ({
  queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseEquityGrantsAll, params],
  staleTime: 5 * 60_000,
});

export const workforceCostSummaryQueryOptions = () => ({
  queryKey: [...humanResourcesQueryKeys.hr.hrEnterpriseCostingAll, "summary"] as const,
  staleTime: 5 * 60_000,
});
