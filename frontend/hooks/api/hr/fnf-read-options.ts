import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function fnfListQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.fnfList(),
    staleTime: 30_000,
  } as const;
}
