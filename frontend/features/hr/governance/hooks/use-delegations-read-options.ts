import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function orgDelegationsQueryOptions(params?: {
  scope?: string;
  active?: boolean;
  cursor?: string;
  limit?: number;
}) {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.hrDelegationsAll, "org", params] as const,
    staleTime: 30_000,
  } as const;
}
