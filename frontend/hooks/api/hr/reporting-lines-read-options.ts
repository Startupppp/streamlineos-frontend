import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function managerCoverageQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.managerCoverage(),
    staleTime: 60_000,
  } as const;
}
