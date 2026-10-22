import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export const reviewCyclesQueryOptions = () => ({
  queryKey: humanResourcesQueryKeys.hr.reviewCycles(),
  staleTime: 2 * 60_000,
});
