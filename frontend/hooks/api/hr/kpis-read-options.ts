import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const hrKpisQueryOptions = () => ({
  queryKey: humanResourcesQueryKeys.hr.kpis(),
  staleTime: 2 * 60_000,
});
