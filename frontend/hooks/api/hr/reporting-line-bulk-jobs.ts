"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { humanResourcesQueryKeys } from "@/lib/query-keys/human-resources";
import { reportingLineBulkJobsQueryOptions, reportingLineBulkJobQueryOptions } from "./reporting-line-bulk-jobs-read-options";
import { useCan, useModuleEnabled } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";
import { invalidateHrWorkforceQueries } from "@/lib/hr-workforce-cache";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { downloadBlob } from "@/lib/download-blob";
import type {
  BulkJob,
  BulkJobPage,
  CommitBulkJobInput,
  CreateBulkJobInput,
} from "@/hooks/api/hr/reporting-line-bulk-jobs-schema";


const jobLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-line-bulk-jobs-schema").then((m) => m.bulkJobContract),
);
const jobPageLazy = lazyContract(() =>
  import("@/hooks/api/hr/reporting-line-bulk-jobs-schema").then((m) => m.bulkJobPageContract),
);

export function useReportingLineBulkJobs(cursor?: string) {
  const canManage = useCan("hr:reporting-lines:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    ...reportingLineBulkJobsQueryOptions({ cursor: cursor ?? null }),
    queryFn: ({ signal }) =>
      apiClient.get<BulkJobPage>(
        "/hr/reporting-lines/bulk-jobs",
        cursor ? { cursor } : undefined,
        signal,
        jobPageLazy,
      ),
    enabled: hrEnabled && canManage,
    placeholderData: (previous) => previous,
    ...INLINE_READ_ERROR,
  });
}

export function useReportingLineBulkJob(jobId: string, rowCursor?: string) {
  const canManage = useCan("hr:reporting-lines:manage");
  const hrEnabled = useModuleEnabled("hr");
  return useQuery({
    ...reportingLineBulkJobQueryOptions(jobId, rowCursor),
    queryFn: ({ signal }) =>
      apiClient.get<BulkJob>(
        `/hr/reporting-lines/bulk-jobs/${jobId}`,
        rowCursor ? { rowCursor } : undefined,
        signal,
        jobLazy,
      ),
    enabled: hrEnabled && canManage && jobId !== "",
    placeholderData: (previous) => previous,
    ...INLINE_READ_ERROR,
  });
}

export function useCreateReportingLineBulkJob() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:reporting-lines:manage", {
    mutationKey: ["hr", "reportingLines", "bulkJobs", "create"],
    mutationFn: (input: CreateBulkJobInput) =>
      apiClient.post<BulkJob>("/hr/reporting-lines/bulk-jobs", input, operation.configFor(input), jobLazy),
    onSuccess: (job) => {
      operation.settle();
      qc.setQueryData(humanResourcesQueryKeys.hr.reportingLineBulkJob(job.jobId), job);
      void qc.invalidateQueries({ queryKey: humanResourcesQueryKeys.hr.reportingLineBulkJobs() });
    },
  });
}

export function useCommitReportingLineBulkJob() {
  const qc = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("hr:reporting-lines:manage", {
    mutationKey: ["hr", "reportingLines", "bulkJobs", "commit"],
    mutationFn: ({ jobId, ...body }: CommitBulkJobInput & { jobId: string }) =>
      apiClient.post<BulkJob>(
        `/hr/reporting-lines/bulk-jobs/${jobId}/commit`,
        body,
        operation.configFor({ jobId, ...body }),
        jobLazy,
      ),
    onSuccess: (job) => {
      operation.settle();
      qc.setQueryData(humanResourcesQueryKeys.hr.reportingLineBulkJob(job.jobId), job);
      void invalidateHrWorkforceQueries(qc, undefined, [
        humanResourcesQueryKeys.hr.reportingLineBulkJobs(),
        humanResourcesQueryKeys.hr.reportingLinesAll(),
      ]);
    },
  });
}

export async function downloadReportingLineBulkJobFailures(jobId: string): Promise<void> {
  const blob = await apiClient.download(`/hr/reporting-lines/bulk-jobs/${jobId}/failures.csv`);
  downloadBlob(blob, `reporting-change-${jobId.slice(0, 8)}-failures.csv`);
}
