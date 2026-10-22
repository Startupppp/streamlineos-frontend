import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function holidaysQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.holidays(),
    staleTime: 300_000,
  } as const;
}
