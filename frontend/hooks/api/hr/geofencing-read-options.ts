import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function geofencesQueryOptions() {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.all, "geofences"] as const,
    staleTime: 5 * 60_000,
  } as const;
}
