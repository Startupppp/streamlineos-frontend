import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const bgvListQueryOptions = () => ({
  queryKey: humanResourcesQueryKeys.hr.bgvList(),
  staleTime: 2 * 60_000,
} as const);
