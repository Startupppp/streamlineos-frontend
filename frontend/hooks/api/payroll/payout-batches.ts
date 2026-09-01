"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ValidationItem,
  PayoutBatch,
  CreateBatchResult,
  GetBatchResult,
  EmployeeBankDetails,
  BatchFormat,
} from "@/types/payroll";

export function usePayoutValidation(runId: number) {
  const canManage = useCan("payroll:bank:manage");
  return useQuery<ValidationItem[]>({
    queryKey: queryKeys.payroll.bankValidation(runId),
    queryFn: ({ signal }) =>
      apiClient.get<ValidationItem[]>(
        `/payroll/runs/${runId}/payout/validation`, signal,
      ),
    staleTime: 30_000,
    enabled: canManage && runId > 0,
  });
}

type PayoutBatchesPage = {
  data: PayoutBatch[];
  pagination: { limit: number; nextCursor: string | null; hasMore: boolean };
};

export function usePayoutBatches(runId?: number) {
  const canManage = useCan("payroll:bank:manage");
  return useQuery<PayoutBatchesPage>({
    queryKey: queryKeys.payroll.bankBatches(runId),
    queryFn: ({ signal }) =>
      apiClient.get<PayoutBatchesPage>(
        "/payroll/payout/batches",
        runId ? { runId } : undefined, signal,
      ),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function usePayoutBatch(batchId: number) {
  const canManage = useCan("payroll:bank:manage");
  return useQuery<GetBatchResult>({
    queryKey: queryKeys.payroll.bankBatch(batchId),
    queryFn: ({ signal }) =>
      apiClient.get<GetBatchResult>(`/payroll/payout/batches/${batchId}`, undefined, signal),
    staleTime: 30_000,
    enabled: canManage && batchId > 0,
  });
}

export function useCreatePayoutBatch() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    CreateBatchResult,
    Error,
    { runId: number; format?: BatchFormat; idempotencyKey?: string }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "create-batch"],
    mutationFn: ({ runId, format, idempotencyKey }) =>
      apiClient.post<CreateBatchResult>(
        `/payroll/runs/${runId}/payout/batches`,
        format ? { format } : {},
        idempotencyKey
          ? { headers: { "idempotency-key": idempotencyKey } }
          : undefined,
      ),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatches(runId),
      });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches() });
    },
  });
}

export function useMarkBatchSent() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { batchId: number; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "mark-batch-sent"],
    mutationFn: ({ batchId }) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${batchId}/mark-sent`,
      ),
    onSuccess: (_, { batchId, runId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatch(batchId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatches(runId),
      });
    },
  });
}

export function useMarkBatchPaid() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { batchId: number; transactionRef: string; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "mark-batch-paid"],
    mutationFn: ({ batchId, transactionRef }) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${batchId}/mark-paid`,
        { transactionRef },
      ),
    onSuccess: (_, { batchId, runId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatch(batchId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatches(runId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.run(runId ?? 0),
      });
    },
  });
}

export function useMarkItemPaid() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { batchId: number; itemId: number; transactionRef: string; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "mark-item-paid"],
    mutationFn: ({ batchId, itemId, transactionRef }) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${batchId}/items/${itemId}/mark-paid`,
        { transactionRef },
      ),
    onSuccess: (_, { batchId, runId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatch(batchId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatches(runId),
      });
    },
  });
}

export function useMarkItemFailed() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { batchId: number; itemId: number; failureReason: string; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "mark-item-failed"],
    mutationFn: ({ batchId, itemId, failureReason }) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${batchId}/items/${itemId}/mark-failed`,
        { failureReason },
      ),
    onSuccess: (_, { batchId, runId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatch(batchId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatches(runId),
      });
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
  return useAuthorizedMutation<
    BankReturnImportResult,
    Error,
    { batchId: number; csv: string; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "import-bank-return"],
    mutationFn: ({ batchId, csv }) =>
      apiClient.post<BankReturnImportResult>(
        `/payroll/payout/batches/${batchId}/import-return`,
        { csv },
      ),
    onSuccess: (_, { batchId, runId }) => {
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatch(batchId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.bankBatches(runId),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.run(runId ?? 0),
      });
      void qc.invalidateQueries({
        queryKey: queryKeys.payroll.journalBatchesAll,
      });
    },
  });
}

export function useEmployeeBankDetails(
  employeeUserId: string,
  enabled = false,
) {
  const canView = useCan("payroll:bank:view");
  return useQuery<EmployeeBankDetails>({
    queryKey: queryKeys.payroll.employeeBank(employeeUserId),
    queryFn: ({ signal }) =>
      apiClient.get<EmployeeBankDetails>(
        `/payroll/employees/${employeeUserId}/bank`, signal,
      ),
    staleTime: 0,
    enabled: enabled && !!employeeUserId && canView,
  });
}
