import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const hrWorkforcePlansQueryOptions = () => ({
  queryKey: [...humanResourcesQueryKeys.hr.all, "workforce", "plans"] as const,
  staleTime: 5 * 60_000,
});
