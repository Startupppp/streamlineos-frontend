"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type {
  JournalBatch,
  JournalBatchDetail,
  JournalReconStatus,
  PaginatedJournalBatches,
  CreateJournalBatchInput,
  PeriodReconciliationReport,
} from "@/types/payroll/journal-batches";

export function useJournalBatches(params?: { periodKey?: string; page?: number; limit?: number }) {
  const canView = useCan("payroll:accounting:view");
  return useQuery({
    queryKey: queryKeys.payroll.journalBatches(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<PaginatedJournalBatches>(
        "/payroll/accounting/journal-batches",
        params as Record<string, string | number> | undefined, signal,
      ),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePeriodReconciliation(periodKey: string, enabled = true) {
  const canView = useCan("payroll:accounting:view");
  return useQuery({
    queryKey: queryKeys.payroll.periodReconciliation(periodKey),
    queryFn: ({ signal }) =>
      apiClient.get<PeriodReconciliationReport>(
        "/payroll/accounting/journal-batches/period-reconciliation",
        { periodKey }, signal,
      ),
    enabled: enabled && canView && /^\d{4}-\d{2}$/.test(periodKey),
    staleTime: 30_000,
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
    onSuccess: (_, batchId) => invalidate(batchId),
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
    onSuccess: (_, { batchId }) => invalidate(batchId),
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
    onSuccess: (_, { batchId }) => invalidate(batchId),
  });
}
