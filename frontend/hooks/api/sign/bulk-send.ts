"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignBulkSendJob, SignBulkSendRow } from "@/types/sign";

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
    onSuccess: (data) => qc.invalidateQueries({ queryKey: queryKeys.signBulkSend.job(data.job.id) }),
  });
}

export function useBulkSendJob(id: number | undefined) {
  return useQuery({
    queryKey: queryKeys.signBulkSend.job(id ?? 0),
    queryFn: () => apiClient.get<{ job: SignBulkSendJob; rows: SignBulkSendRow[] }>(`/sign/bulk-send/jobs/${id}`),
    enabled: id !== undefined,
    staleTime: 10_000,
  });
}

export function useCancelBulkSendJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["signBulkSend", "cancel"],
    mutationFn: (id: number) => apiClient.post<SignBulkSendJob>(`/sign/bulk-send/jobs/${id}/cancel`),
    onSuccess: (data) => qc.invalidateQueries({ queryKey: queryKeys.signBulkSend.job(data.id) }),
  });
}

export function useBulkSendErrorReport(id: number | undefined) {
  return useQuery({
    queryKey: [...queryKeys.signBulkSend.job(id ?? 0), "error-report"] as const,
    queryFn: () => apiClient.get<SignBulkSendRow[]>(`/sign/bulk-send/jobs/${id}/error-report`),
    enabled: id !== undefined,
  });
}
