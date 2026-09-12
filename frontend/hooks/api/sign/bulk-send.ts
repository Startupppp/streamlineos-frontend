"use client";

import { useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignBulkSendErrorReport, SignBulkSendJob, SignBulkSendJobDetail } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
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
  /**
   * True since the backend stopped sending inside the request (SIGN-P0-05).
   * The response now describes a job that has been accepted, not one that has
   * finished, so the UI must go and watch it rather than treat this as the
   * final word.
   */
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

/**
 * The statuses that mean work is still outstanding.
 *
 * Kept beside the polling that reads it: a job left out of this set stops
 * updating on screen and sits at whatever count it had when the page loaded,
 * which looks exactly like a job that stalled.
 */
export const ACTIVE_BULK_SEND_STATUSES: ReadonlySet<SignBulkSendJob["status"]> = new Set([
  "pending",
  "validating",
  "running",
]);

/**
 * 3s. The work is a queue of template instantiations and emails, so progress
 * arrives in seconds, not milliseconds; polling faster would spend requests to
 * re-read the same row.
 */
const BULK_SEND_POLL_MS = 3_000;

/**
 * How long until the next poll, or `false` to stop.
 *
 * Extracted rather than inlined in the hook so it can be held by a test. The
 * two ways this goes wrong are both silent: polling forever on a page whose
 * jobs all finished (a request every three seconds, indefinitely), or never
 * polling at all, which shows a queued job frozen at its starting count and
 * reads exactly like a stalled worker.
 */
export function bulkSendPollInterval(
  jobs: Pick<SignBulkSendJob, "status">[] | undefined,
): number | false {
  if (!jobs) return false;
  return jobs.some((job) => ACTIVE_BULK_SEND_STATUSES.has(job.status)) ? BULK_SEND_POLL_MS : false;
}

export function useCreateBulkSendJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:bulk_send:run", {
    mutationKey: ["signBulkSend", "create"],
    mutationFn: (input: CreateBulkSendJobInput) => apiClient.post<BulkSendJobResult>("/sign/bulk-send/jobs", input, undefined, signBulkJobCreateContract),
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
    /**
     * Polls only while something is actually running, and stops on its own
     * once every job is terminal — a permanent interval would keep asking
     * forever on a page whose jobs all finished days ago.
     *
     * This is not decoration. Bulk send used to complete inside the POST, so
     * the response was the whole story; now the request returns with the job
     * queued and a worker finishes it, and without this the list shows
     * "pending 0/N" until someone reloads the page.
     */
    refetchInterval: (query) => bulkSendPollInterval(query.state.data),
  });
}

/** One job with its first page of rows, polled on the same terms as the list. */
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
