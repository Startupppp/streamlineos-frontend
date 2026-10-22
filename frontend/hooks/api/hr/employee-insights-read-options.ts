import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function skillsMatrixQueryOptions(params?: { cursor?: string; limit?: number }) {
  return {
    queryKey: humanResourcesQueryKeys.hr.skillsMatrix({ cursor: params?.cursor, limit: params?.limit ?? 20 }),
    staleTime: 60_000,
  } as const;
}
