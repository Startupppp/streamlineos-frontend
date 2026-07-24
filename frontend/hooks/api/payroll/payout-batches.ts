"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  ValidationItem,
  PayoutBatch,
  CreateBatchResult,
  GetBatchResult,
  EmployeeBankDetails,
  BatchFormat,
} from "@/types/payroll";

export function usePayoutValidation(runId: number) {
  return useQuery<ValidationItem[]>({
    queryKey: queryKeys.payroll.bankValidation(runId),
    queryFn: () => apiClient.get<ValidationItem[]>(`/payroll/runs/${runId}/payout/validation`),
    staleTime: 30_000,
    enabled: runId > 0,
  });
}

export function usePayoutBatches(runId?: number) {
  return useQuery<PayoutBatch[]>({
    queryKey: queryKeys.payroll.bankBatches(runId),
    queryFn: () =>
      apiClient.get<PayoutBatch[]>("/payroll/payout/batches", runId ? { runId } : undefined),
    staleTime: 30_000,
  });
}

export function usePayoutBatch(batchId: number) {
  return useQuery<GetBatchResult>({
    queryKey: queryKeys.payroll.bankBatch(batchId),
    queryFn: () => apiClient.get<GetBatchResult>(`/payroll/payout/batches/${batchId}`),
    staleTime: 30_000,
    enabled: batchId > 0,
  });
}

export function useCreatePayoutBatch() {
  const qc = useQueryClient();
  return useMutation<
    CreateBatchResult,
    Error,
    { runId: number; format?: BatchFormat; idempotencyKey?: string }
  >({
    mutationKey: ["payroll", "create-batch"],
    mutationFn: ({ runId, format, idempotencyKey }) =>
      apiClient.post<CreateBatchResult>(
        `/payroll/runs/${runId}/payout/batches`,
        format ? { format } : {},
        idempotencyKey ? { headers: { "idempotency-key": idempotencyKey } } : undefined,
      ),
    onSuccess: (_data, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches() });
    },
  });
}

export function useMarkBatchSent() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, { batchId: number; runId?: number }>({
    mutationKey: ["payroll", "mark-batch-sent"],
    mutationFn: ({ batchId }) =>
      apiClient.post<{ success: boolean }>(`/payroll/payout/batches/${batchId}/mark-sent`),
    onSuccess: (_data, { batchId, runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatch(batchId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches(runId) });
    },
  });
}

export function useMarkBatchPaid() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { batchId: number; transactionRef: string; runId?: number }
  >({
    mutationKey: ["payroll", "mark-batch-paid"],
    mutationFn: ({ batchId, transactionRef }) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${batchId}/mark-paid`,
        { transactionRef },
      ),
    onSuccess: (_data, { batchId, runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatch(batchId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId ?? 0) });
    },
  });
}

export function useMarkItemPaid() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { batchId: number; itemId: number; transactionRef: string; runId?: number }
  >({
    mutationKey: ["payroll", "mark-item-paid"],
    mutationFn: ({ batchId, itemId, transactionRef }) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${batchId}/items/${itemId}/mark-paid`,
        { transactionRef },
      ),
    onSuccess: (_data, { batchId, runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatch(batchId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches(runId) });
    },
  });
}

export function useMarkItemFailed() {
  const qc = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { batchId: number; itemId: number; failureReason: string; runId?: number }
  >({
    mutationKey: ["payroll", "mark-item-failed"],
    mutationFn: ({ batchId, itemId, failureReason }) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${batchId}/items/${itemId}/mark-failed`,
        { failureReason },
      ),
    onSuccess: (_data, { batchId, runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatch(batchId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches(runId) });
    },
  });
}

export interface BankReturnImportResult {
  success: boolean;
  paid: number;
  failed: number;
  skipped: number;
  parseErrors: { line: number; message: string }[];
  honestyNote: string;
  mode: "export_manual";
}

export function useImportBankReturn() {
  const qc = useQueryClient();
  return useMutation<
    BankReturnImportResult,
    Error,
    { batchId: number; csv: string; runId?: number }
  >({
    mutationKey: ["payroll", "import-bank-return"],
    mutationFn: ({ batchId, csv }) =>
      apiClient.post<BankReturnImportResult>(
        `/payroll/payout/batches/${batchId}/import-return`,
        { csv },
      ),
    onSuccess: (_data, { batchId, runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatch(batchId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId ?? 0) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.journalBatchesAll });
    },
  });
}

export function useEmployeeBankDetails(employeeUserId: string, enabled = false) {
  return useQuery<EmployeeBankDetails>({
    queryKey: queryKeys.payroll.employeeBank(employeeUserId),
    queryFn: () =>
      apiClient.get<EmployeeBankDetails>(`/payroll/employees/${employeeUserId}/bank`),
    staleTime: 0,
    enabled: enabled && !!employeeUserId,
  });
}
