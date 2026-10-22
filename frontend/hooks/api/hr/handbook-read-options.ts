import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function handbookListQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.handbookList(),
    staleTime: 2 * 60_000,
  } as const;
}
