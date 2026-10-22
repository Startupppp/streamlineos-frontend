import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function orgRolesQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.orgRoles(),
    staleTime: 5 * 60_000,
  } as const;
}
