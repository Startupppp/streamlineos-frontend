"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignBulkSendJob } from "@/types/sign";

export interface CreateBulkSendJobInput {
  templateId: number;
  columnMapping: Record<string, string>;
  rows: Record<string, unknown>[];
  dryRun?: boolean;
}

export interface BulkSendJobResult {
  job: SignBulkSendJob;
  preview?: { rowNumber: number; name?: string; email?: string; error?: string }[];
  dryRun: boolean;
  /**
   * True since the backend stopped sending inside the request (SIGN-P0-05).
   * The response now describes a job that has been accepted, not one that has
   * finished, so the UI must go and watch it rather than treat this as the
   * final word.
   */
  queued?: boolean;
}

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
  return useMutation({
    mutationKey: ["signBulkSend", "create"],
    mutationFn: (input: CreateBulkSendJobInput) => apiClient.post<BulkSendJobResult>("/sign/bulk-send/jobs", input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.signBulkSend.job(data.job.id) });
      qc.invalidateQueries({ queryKey: queryKeys.signBulkSend.all });
    },
  });
}

export function useBulkSendJobs() {
  return useQuery({
    queryKey: queryKeys.signBulkSend.all,
    queryFn: () => apiClient.get<SignBulkSendJob[]>("/sign/bulk-send/jobs"),
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

export interface BulkSendJobRow {
  id: number;
  rowNumber: number;
  /** Mirrors the backend `sign_bulk_row_status` enum exactly. */
  status: "pending" | "success" | "failed";
  rawDataJson: Record<string, unknown>;
  errorMessage: string | null;
  envelopeId: number | null;
  attempts: number;
}

export interface BulkSendJobDetail {
  job: SignBulkSendJob;
  rows: BulkSendJobRow[];
}

/** One job with its per-row outcomes, polled on the same terms as the list. */
export function useBulkSendJob(jobId: number | null) {
  return useQuery({
    queryKey: queryKeys.signBulkSend.job(jobId ?? 0),
    queryFn: () => apiClient.get<BulkSendJobDetail>(`/sign/bulk-send/jobs/${jobId}`),
    enabled: jobId !== null,
    refetchInterval: (query) => {
      const job = query.state.data?.job;
      return bulkSendPollInterval(job ? [job] : undefined);
    },
  });
}

export function useCancelBulkSendJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signBulkSend", "cancel"],
    mutationFn: (id: number) => apiClient.post<SignBulkSendJob>(`/sign/bulk-send/jobs/${id}/cancel`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.signBulkSend.job(data.id) });
      qc.invalidateQueries({ queryKey: queryKeys.signBulkSend.all });
    },
  });
}
