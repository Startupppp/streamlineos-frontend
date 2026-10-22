import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function managerHomeQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.myTeam(),
    staleTime: 30_000,
  } as const;
}
