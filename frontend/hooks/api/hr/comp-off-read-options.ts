import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function compOffQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.compOff(),
    staleTime: 60_000,
  } as const;
}
