import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function assetReturnsQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.assetReturnsList(),
    staleTime: 60_000,
  } as const;
}
