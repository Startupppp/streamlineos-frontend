import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function hrShiftsQueryOptions() {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.all, "shifts"] as const,
    staleTime: 2 * 60_000,
  } as const;
}
