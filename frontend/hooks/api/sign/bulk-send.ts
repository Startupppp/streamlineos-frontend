"use client";

import { useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignBulkSendErrorReport, SignBulkSendJob, SignBulkSendJobDetail } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useAuthorizedIdempotentMutation } from "@/hooks/api/inventory/use-idempotent-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export interface CreateBulkSendJobInput {
  templateId: number;
  columnMapping: Record<string, string>;
  rows: Record<string, unknown>[];
  dryRun?: boolean;
}

export interface BulkSendJobResult {
  job: SignBulkSendJob;
  preview?: unknown;
  dryRun: boolean;
  queued?: boolean;
}

const signBulkJobCreateContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signBulkJobCreateContract),
);

const signBulkJobListContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signBulkJobListContract),
);

const signBulkJobCancelContract = lazyContract(() =>
  import("@/hooks/api/sign/sign-schema").then((m) => m.signBulkJobCancelContract),
);

export const ACTIVE_BULK_SEND_STATUSES: ReadonlySet<SignBulkSendJob["status"]> = new Set([
  "pending",
  "validating",
  "running",
]);

const BULK_SEND_POLL_MS = 3_000;

export function bulkSendPollInterval(
  jobs: Pick<SignBulkSendJob, "status">[] | undefined,
): number | false {
  if (!jobs) return false;
  return jobs.some((job) => ACTIVE_BULK_SEND_STATUSES.has(job.status)) ? BULK_SEND_POLL_MS : false;
}

export function useCreateBulkSendJob() {
  const qc = useQueryClient();
  return useAuthorizedIdempotentMutation<BulkSendJobResult, Error, CreateBulkSendJobInput>("sign:bulk_send:run", {
    mutationKey: ["signBulkSend", "create"],
    mutationFn: (input, idempotencyKey) =>
      apiClient.post<BulkSendJobResult>("/sign/bulk-send/jobs", input, {
        headers: { "Idempotency-Key": idempotencyKey },
      }, signBulkJobCreateContract),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signBulkSend.job(data.job.id) });
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signBulkSend.all });
    },
  });
}

export function useBulkSendJobs() {
  return useGatedQuery("sign:bulk_send:run", {
    queryKey: growthAndSignQueryKeys.signBulkSend.all,
    queryFn: ({ signal }) => apiClient.get<SignBulkSendJob[]>("/sign/bulk-send/jobs", undefined, signal, signBulkJobListContract),
    staleTime: 15_000,
    refetchInterval: (query) => bulkSendPollInterval(query.state.data),
  });
}

export function useBulkSendJob(
  jobId: number | undefined,
  options?: Omit<UseQueryOptions<SignBulkSendJobDetail, Error>, "queryKey" | "queryFn">,
) {
  return useGatedQuery("sign:bulk_send:run", {
    queryKey: growthAndSignQueryKeys.signBulkSend.job(jobId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<SignBulkSendJobDetail>(`/sign/bulk-send/jobs/${jobId}`, undefined, signal),
    staleTime: 0,
    refetchInterval: (query) => {
      const job = query.state.data?.job;
      return bulkSendPollInterval(job ? [job] : undefined);
    },
    ...options,
    enabled: jobId !== undefined && (options?.enabled ?? true),
  });
}

export function useBulkSendJobErrorReport(
  jobId: number | undefined,
  options?: Omit<UseQueryOptions<SignBulkSendErrorReport, Error>, "queryKey" | "queryFn">,
) {
  return useGatedQuery("sign:bulk_send:run", {
    queryKey: growthAndSignQueryKeys.signBulkSend.errorReport(jobId ?? 0),
    queryFn: ({ signal }) =>
      apiClient.get<SignBulkSendErrorReport>(`/sign/bulk-send/jobs/${jobId}/error-report`, undefined, signal),
    staleTime: 15_000,
    ...options,
    enabled: jobId !== undefined && (options?.enabled ?? true),
  });
}

export function useCancelBulkSendJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:bulk_send:run", {
    mutationKey: ["signBulkSend", "cancel"],
    mutationFn: (id: number) => apiClient.post<SignBulkSendJob>(`/sign/bulk-send/jobs/${id}/cancel`, undefined, undefined, signBulkJobCancelContract),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signBulkSend.job(data.id) });
      qc.invalidateQueries({ queryKey: growthAndSignQueryKeys.signBulkSend.all });
    },
  });
}
