import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function travelMineQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.travelMine(),
    staleTime: 60_000,
  } as const;
}

export function travelApprovalsQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.travelApprovals(),
    staleTime: 30_000,
  } as const;
}
