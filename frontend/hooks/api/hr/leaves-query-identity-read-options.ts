import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function leaveContextQueryOptions(orgId: string, userId: string, accessVersion: number) {
  return {
    queryKey: humanResourcesQueryKeys.hr.leaves(orgId, userId, accessVersion),
    staleTime: 2 * 60_000,
  } as const;
}
