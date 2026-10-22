import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function rostersQueryOptions() {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.all, "rosters"] as const,
    staleTime: 2 * 60_000,
  } as const;
}
