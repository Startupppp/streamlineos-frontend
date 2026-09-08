"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";

const journalBatchListC = lazyContract(() =>
  import("@/hooks/api/payroll/journal-batches-schema").then((m) => m.journalBatchListContract),
);
const periodReconciliationC = lazyContract(() =>
  import("@/hooks/api/payroll/journal-batches-schema").then((m) => m.periodReconciliationReportContract),
);
const journalBatchDetailC = lazyContract(() =>
  import("@/hooks/api/payroll/journal-batches-schema").then((m) => m.journalBatchDetailContract),
);
const journalBatchSummaryC = lazyContract(() =>
  import("@/hooks/api/payroll/journal-batches-schema").then((m) => m.journalBatchSummaryContract),
);
import type {
  JournalBatch,
  JournalBatchDetail,
  JournalReconStatus,
  PaginatedJournalBatches,
  CreateJournalBatchInput,
  PeriodReconciliationReport,
} from "@/types/payroll/journal-batches";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export function useJournalBatches(params?: { periodKey?: string; page?: number; limit?: number }) {
  const canView = useCan("payroll:accounting:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.journalBatches(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/payroll/accounting/journal-batches",
        params, signal, journalBatchListC,
      ),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function usePeriodReconciliation(periodKey: string, enabled = true) {
  const canView = useCan("payroll:accounting:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.periodReconciliation(periodKey),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/payroll/accounting/journal-batches/period-reconciliation",
        { periodKey }, signal, periodReconciliationC,
      ),
    enabled: enabled && canView && /^\d{4}-\d{2}$/.test(periodKey),
    staleTime: 30_000,
  });
}

function useInvalidateBatches() {
  const qc = useQueryClient();
  return (batchId?: number) => {
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.journalBatchesAll });
    void qc.invalidateQueries({
      queryKey: [...payrollQueryKeys.payroll.all, "period-reconciliation"],
    });
    if (batchId !== undefined) {
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.journalBatch(batchId) });
    }
  };
}

export function useCreateJournalBatch() {
  const invalidate = useInvalidateBatches();
  return useAuthorizedMutation("payroll:accounting:manage", {
    mutationKey: ["payroll", "journal-batches", "create"],
    mutationFn: (input: CreateJournalBatchInput) =>
      apiClient.post<JournalBatchDetail>("/payroll/accounting/journal-batches", input, undefined, journalBatchDetailC),
    onSuccess: () => invalidate(),
  });
}

export function usePostJournalBatch() {
  const invalidate = useInvalidateBatches();
  return useAuthorizedMutation("payroll:accounting:manage", {
    mutationKey: ["payroll", "journal-batches", "post"],
    mutationFn: (batchId: number) =>
      apiClient.post<JournalBatch>(`/payroll/accounting/journal-batches/${batchId}/post`, undefined, undefined, journalBatchSummaryC),
    onSuccess: (_, batchId) => invalidate(batchId),
  });
}

export function useReverseJournalBatch() {
  const invalidate = useInvalidateBatches();
  return useAuthorizedMutation("payroll:accounting:manage", {
    mutationKey: ["payroll", "journal-batches", "reverse"],
    mutationFn: ({ batchId, reason }: { batchId: number; reason: string }) =>
      apiClient.post<JournalBatch>(`/payroll/accounting/journal-batches/${batchId}/reverse`, { reason }, undefined, journalBatchSummaryC),
    onSuccess: (_, { batchId }) => invalidate(batchId),
  });
}

export function useReconcileJournalBatch() {
  const invalidate = useInvalidateBatches();
  return useAuthorizedMutation("payroll:accounting:manage", {
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
      apiClient.post<JournalBatch>(`/payroll/accounting/journal-batches/${batchId}/reconcile`, { status, note }, undefined, journalBatchSummaryC),
    onSuccess: (_, { batchId }) => invalidate(batchId),
  });
}
