import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function attendanceStatusQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.attendanceStatus(),
    staleTime: 2 * 60_000,
  } as const;
}
