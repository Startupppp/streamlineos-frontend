import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function unionMembershipsListQueryOptions(params?: {
  unionName?: string;
  status?: string;
  cursor?: string;
  limit?: number;
}) {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.hrLaborMembershipsAll, params] as const,
    staleTime: 30_000,
  };
}
