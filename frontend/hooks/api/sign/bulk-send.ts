"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { SignBulkSendJob } from "@/types/sign";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

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
  return useAuthorizedMutation("sign:bulk_send:run", {
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
    queryFn: ({ signal }) => apiClient.get<SignBulkSendJob[]>("/sign/bulk-send/jobs", undefined, signal),
    staleTime: 15_000,
  });
}

export function useCancelBulkSendJob() {
  const qc = useQueryClient();
  return useAuthorizedMutation("sign:bulk_send:run", {
    mutationKey: ["signBulkSend", "cancel"],
    mutationFn: (id: number) => apiClient.post<SignBulkSendJob>(`/sign/bulk-send/jobs/${id}/cancel`),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: queryKeys.signBulkSend.job(data.id) });
      qc.invalidateQueries({ queryKey: queryKeys.signBulkSend.all });
    },
  });
}
