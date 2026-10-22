import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const hrAnalyticsQueryOptions = () => ({
  queryKey: [...humanResourcesQueryKeys.hr.all, "analytics"] as const,
  staleTime: 60_000,
});
