import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function bgvListQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.bgvList(),
    staleTime: 2 * 60_000,
  } as const;
}
