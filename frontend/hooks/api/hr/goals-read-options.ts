import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const hrGoalsQueryOptions = (params?: { userId?: string }) => ({
  queryKey: humanResourcesQueryKeys.hr.goals(params?.userId),
  staleTime: 60_000,
});
