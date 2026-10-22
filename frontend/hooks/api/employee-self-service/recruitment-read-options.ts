import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function assignedInterviewsQueryOptions(page: number) {
  return {
    queryKey: humanResourcesQueryKeys.hr.hrAssignedInterviews(page),
    staleTime: 60_000,
  } as const;
}
