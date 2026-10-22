import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const feedbackCyclesQueryOptions = () => ({
  queryKey: humanResourcesQueryKeys.hr.feedbackCycles(),
  staleTime: 2 * 60_000,
});
