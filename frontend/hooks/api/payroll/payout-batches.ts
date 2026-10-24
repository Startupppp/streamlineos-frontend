"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

const payoutValidationC = lazyContract(() =>
  import("@/hooks/api/payroll/payout-schema").then((m) => m.payoutValidationResponseContract),
);
const batchListC = lazyContract(() =>
  import("@/hooks/api/payroll/payout-schema").then((m) => m.batchListContract),
);
const batchDetailC = lazyContract(() =>
  import("@/hooks/api/payroll/payout-schema").then((m) => m.batchDetailContract),
);
const createBatchC = lazyContract(() =>
  import("@/hooks/api/payroll/payout-schema").then((m) => m.createBatchResponseContract),
);
const batchOperationC = lazyContract(() =>
  import("@/hooks/api/payroll/payout-schema").then((m) => m.batchOperationResponseContract),
);
const importBankReturnC = lazyContract(() =>
  import("@/hooks/api/payroll/payout-schema").then((m) => m.importBankReturnResponseContract),
);
const payoutBankDetailsC = lazyContract(() =>
  import("@/hooks/api/payroll/payout-schema").then((m) => m.payoutBankDetailsContract),
);
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
  return useQuery({
    queryKey: payrollQueryKeys.payroll.bankValidation(runId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/payroll/runs/${runId}/payout/validation`, undefined, signal, payoutValidationC,
      ),
    staleTime: 30_000,
    enabled: canManage && runId > 0,
  });
}

export function usePayoutBatches(runId?: number) {
  const canManage = useCan("payroll:bank:manage");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.bankBatches(runId),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/payroll/payout/batches",
        runId ? { runId } : undefined, signal, batchListC,
      ),
    staleTime: 30_000,
    enabled: canManage,
    ...INLINE_READ_ERROR,
  });
}

export function usePayoutBatch(batchId: number) {
  const canManage = useCan("payroll:bank:manage");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.bankBatch(batchId),
    queryFn: ({ signal }) =>
      apiClient.get(`/payroll/payout/batches/${batchId}`, undefined, signal, batchDetailC),
    staleTime: 30_000,
    enabled: canManage && batchId > 0,
  });
}

export function useCreatePayoutBatch() {
  const qc = useQueryClient();
  return useAuthorizedMutation(
    "payroll:bank:manage",
    {
    mutationKey: ["payroll", "create-batch"],
    mutationFn: ({ runId, format, idempotencyKey }: { runId: number; format?: BatchFormat; idempotencyKey?: string }) =>
      apiClient.post(
        `/payroll/runs/${runId}/payout/batches`,
        format ? { format } : {},
        idempotencyKey
          ? { headers: { "idempotency-key": idempotencyKey } }
          : undefined,
        createBatchC,
      ),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.payroll.bankBatches(runId),
      });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.bankBatches() });
    },
  });
}

export function useDownloadBatchFile() {
  return useAuthorizedMutation<Blob, Error, number>("payroll:bank:manage", {
    mutationKey: ["payroll", "batch-file"],
    mutationFn: (batchId) =>
      apiClient.download(`/payroll/payout/batches/${batchId}/file`),
  });
}

function useInvalidatePayoutSurfaces() {
  const qc = useQueryClient();
  return (batchId: number, runId?: number) => {
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.bankBatch(batchId) });
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.bankBatches(runId) });
    void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "runs"] });
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
  };
}

export function useMarkBatchSent() {
  const invalidatePayoutSurfaces = useInvalidatePayoutSurfaces();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { batchId: number; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "mark-batch-sent"],
    mutationFn: (variables) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${variables.batchId}/mark-sent`,
        undefined,
        operation.configFor(variables),
        batchOperationC,
      ),
    onSuccess: (_, { batchId, runId }) => {
      operation.settle();
      invalidatePayoutSurfaces(batchId, runId);
    },
  });
}

export function useMarkBatchPaid() {
  const invalidatePayoutSurfaces = useInvalidatePayoutSurfaces();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { batchId: number; transactionRef: string; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "mark-batch-paid"],
    mutationFn: (variables) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${variables.batchId}/mark-paid`,
        { transactionRef: variables.transactionRef },
        operation.configFor(variables),
        batchOperationC,
      ),
    onSuccess: (_, { batchId, runId }) => {
      operation.settle();
      invalidatePayoutSurfaces(batchId, runId);
    },
  });
}

export function useMarkItemPaid() {
  const invalidatePayoutSurfaces = useInvalidatePayoutSurfaces();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { batchId: number; itemId: number; transactionRef: string; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "mark-item-paid"],
    mutationFn: (variables) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${variables.batchId}/items/${variables.itemId}/mark-paid`,
        { transactionRef: variables.transactionRef },
        operation.configFor(variables),
        batchOperationC,
      ),
    onSuccess: (_, { batchId, runId }) => {
      operation.settle();
      invalidatePayoutSurfaces(batchId, runId);
    },
  });
}

export function useMarkItemFailed() {
  const invalidatePayoutSurfaces = useInvalidatePayoutSurfaces();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { batchId: number; itemId: number; failureReason: string; runId?: number }
  >("payroll:bank:manage", {
    mutationKey: ["payroll", "mark-item-failed"],
    mutationFn: (variables) =>
      apiClient.post<{ success: boolean }>(
        `/payroll/payout/batches/${variables.batchId}/items/${variables.itemId}/mark-failed`,
        { failureReason: variables.failureReason },
        operation.configFor(variables),
        batchOperationC,
      ),
    onSuccess: (_, { batchId, runId }) => {
      operation.settle();
      invalidatePayoutSurfaces(batchId, runId);
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
  const invalidatePayoutSurfaces = useInvalidatePayoutSurfaces();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation("payroll:bank:manage", {
    mutationKey: ["payroll", "import-bank-return"],
    mutationFn: (variables: { batchId: number; csv: string; runId?: number }) =>
      apiClient.post(
        `/payroll/payout/batches/${variables.batchId}/import-return`,
        { csv: variables.csv },
        operation.configFor(variables),
        importBankReturnC,
      ),
    onSuccess: (_, { batchId, runId }) => {
      operation.settle();
      invalidatePayoutSurfaces(batchId, runId);
      void qc.invalidateQueries({
        queryKey: payrollQueryKeys.payroll.journalBatchesAll,
      });
    },
  });
}

export function useEmployeeBankDetails(
  employeeUserId: string,
  enabled = false,
) {
  const canView = useCan("payroll:bank:view");
  return useQuery({
    queryKey: payrollQueryKeys.payroll.employeeBank(employeeUserId),
    queryFn: ({ signal }) =>
      apiClient.get(
        `/payroll/employees/${employeeUserId}/bank`, undefined, signal, payoutBankDetailsC,
      ),
    staleTime: 0,
    enabled: enabled && !!employeeUserId && canView,
  });
}
