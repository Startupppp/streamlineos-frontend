import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function overtimeRequestsQueryOptions(params?: { cursor?: string; pageSize?: number }) {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.all, "overtimeRequests", params ?? {}] as const,
    staleTime: 30_000,
  } as const;
}
