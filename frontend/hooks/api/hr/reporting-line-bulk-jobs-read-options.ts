import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";

export function reportingLineBulkJobsQueryOptions(params: { cursor: string | null }) {
  return {
    queryKey: humanResourcesQueryKeys.hr.reportingLineBulkJobs(params),
    staleTime: 30_000,
  } as const;
}

export function reportingLineBulkJobQueryOptions(jobId: string, rowCursor?: string) {
  return {
    queryKey: humanResourcesQueryKeys.hr.reportingLineBulkJob(jobId, rowCursor),
    staleTime: 30_000,
  } as const;
}
