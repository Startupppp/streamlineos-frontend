"use client";

import { useMutation, useQuery, useQueryClient, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignBulkSendJob, SignBulkSendJobDetail, SignBulkSendRow } from "@/types/sign";

const ACTIVE_JOB_STATUSES: ReadonlySet<SignBulkSendJob["status"]> = new Set(["pending", "validating", "running"]);

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
  });
}

export function useBulkSendJob(
  jobId: number | undefined,
  options?: Omit<UseQueryOptions<SignBulkSendJobDetail, Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.signBulkSend.job(jobId ?? 0),
    queryFn: () => apiClient.get<SignBulkSendJobDetail>(`/sign/bulk-send/jobs/${jobId}`),
    staleTime: 0,
    refetchInterval: (query) =>
      query.state.data && ACTIVE_JOB_STATUSES.has(query.state.data.job.status) ? 5_000 : false,
    ...options,
    enabled: jobId !== undefined && (options?.enabled ?? true),
  });
}

export function useBulkSendJobErrorReport(
  jobId: number | undefined,
  options?: Omit<UseQueryOptions<SignBulkSendRow[], Error>, "queryKey" | "queryFn">,
) {
  return useQuery({
    queryKey: queryKeys.signBulkSend.errorReport(jobId ?? 0),
    queryFn: () => apiClient.get<SignBulkSendRow[]>(`/sign/bulk-send/jobs/${jobId}/error-report`),
    staleTime: 15_000,
    ...options,
    enabled: jobId !== undefined && (options?.enabled ?? true),
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
