"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  JournalBatch,
  JournalBatchDetail,
  JournalReconStatus,
  PaginatedJournalBatches,
  CreateJournalBatchInput,
} from "@/types/payroll/journal-batches";

export function useJournalBatches(params?: { periodKey?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.payroll.journalBatches(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<PaginatedJournalBatches>(
        "/payroll/accounting/journal-batches",
        params as Record<string, string | number> | undefined,
      ),
    staleTime: 60_000,
  });
}

function useInvalidateBatches() {
  const qc = useQueryClient();
  return (batchId?: number) => {
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.journalBatchesAll });
    if (batchId !== undefined) {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.journalBatch(batchId) });
    }
  };
}

export function useCreateJournalBatch() {
  const invalidate = useInvalidateBatches();
  return useMutation({
    mutationKey: ["payroll", "journal-batches", "create"],
    mutationFn: (input: CreateJournalBatchInput) =>
      apiClient.post<JournalBatchDetail>("/payroll/accounting/journal-batches", input),
    onSuccess: () => invalidate(),
  });
}

export function usePostJournalBatch() {
  const invalidate = useInvalidateBatches();
  return useMutation({
    mutationKey: ["payroll", "journal-batches", "post"],
    mutationFn: (batchId: number) =>
      apiClient.post<JournalBatch>(`/payroll/accounting/journal-batches/${batchId}/post`),
    onSuccess: (_d, batchId) => invalidate(batchId),
  });
}

export function useReverseJournalBatch() {
  const invalidate = useInvalidateBatches();
  return useMutation({
    mutationKey: ["payroll", "journal-batches", "reverse"],
    mutationFn: ({ batchId, reason }: { batchId: number; reason: string }) =>
      apiClient.post<JournalBatch>(`/payroll/accounting/journal-batches/${batchId}/reverse`, {
        reason,
      }),
    onSuccess: (_d, { batchId }) => invalidate(batchId),
  });
}

export function useReconcileJournalBatch() {
  const invalidate = useInvalidateBatches();
  return useMutation({
    mutationKey: ["payroll", "journal-batches", "reconcile"],
    mutationFn: ({
      batchId,
      status,
      note,
    }: {
      batchId: number;
      status: JournalReconStatus;
      note?: string;
    }) =>
      apiClient.post<JournalBatch>(`/payroll/accounting/journal-batches/${batchId}/reconcile`, {
        status,
        note,
      }),
    onSuccess: (_d, { batchId }) => invalidate(batchId),
  });
}
