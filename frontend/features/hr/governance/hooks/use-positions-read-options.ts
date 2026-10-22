import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function positionsQueryOptions(params?: {
  status?: string;
  departmentId?: number;
  page?: number;
  limit?: number;
}) {
  return {
    queryKey: [...humanResourcesQueryKeys.hr.hrPositionsAll, params] as const,
    staleTime: 30_000,
  } as const;
}
