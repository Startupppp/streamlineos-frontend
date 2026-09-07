"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { growthAndSignQueryKeys } from "@/lib/query-keys/growth-and-sign";
import type { SignBulkSendJob } from "@/types/sign";
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
  preview?: { rowNumber: number; name?: string; email?: string; error?: string }[];
  dryRun: boolean;
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
