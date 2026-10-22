import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import type { ResignationListParams } from "./exit";

export function exitListQueryOptions(params?: ResignationListParams) {
  return {
    queryKey: humanResourcesQueryKeys.hr.exitList(params),
    staleTime: 2 * 60_000,
  } as const;
}

export function exitDetailQueryOptions(resignationId: number) {
  return {
    queryKey: humanResourcesQueryKeys.hr.exitDetail(resignationId),
    staleTime: 60_000,
  } as const;
}

export function myResignationsQueryOptions() {
  return {
    queryKey: humanResourcesQueryKeys.hr.exitMine(),
    staleTime: 60_000,
  } as const;
}
