"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  PayrollApprovalRow,
  SubmitApprovalResult,
  ApproveStageResult,
} from "@/types/payroll";

export function useRunApprovals(runId: number, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:runs:view");
  return useQuery<PayrollApprovalRow[]>({
    queryKey: queryKeys.payroll.runApprovals(runId),
    queryFn: ({ signal }) => apiClient.get<PayrollApprovalRow[]>(`/payroll/runs/${runId}/approvals`, undefined, signal),
    staleTime: 30_000,
    enabled: canView && runId > 0 && (options?.enabled ?? true),
  });
}

export function useSubmitApproval() {
  const qc = useQueryClient();
  return useAuthorizedMutation<SubmitApprovalResult, Error, { runId: number }>("payroll:runs:update", {
    mutationKey: ["payroll", "submit-approval"],
    mutationFn: ({ runId }) =>
      apiClient.post<SubmitApprovalResult>(`/payroll/runs/${runId}/submit-approval`),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}

export function useApproveStage() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    ApproveStageResult,
    Error,
    { runId: number; approvalId: number; comment?: string }
  >("payroll:runs:approve", {
    mutationKey: ["payroll", "approve-stage"],
    mutationFn: ({ runId, approvalId, comment }) =>
      apiClient.post<ApproveStageResult>(
        `/payroll/runs/${runId}/approvals/${approvalId}/approve`,
        { comment },
      ),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}

export function useRejectStage() {
  const qc = useQueryClient();
  return useAuthorizedMutation<
    ApproveStageResult,
    Error,
    { runId: number; approvalId: number; comment: string }
  >("payroll:runs:approve", {
    mutationKey: ["payroll", "reject-stage"],
    mutationFn: ({ runId, approvalId, comment }) =>
      apiClient.post<ApproveStageResult>(
        `/payroll/runs/${runId}/approvals/${approvalId}/reject`,
        { comment },
      ),
    onSuccess: (_, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}

function useInvalidateRunWorkspace() {
  const qc = useQueryClient();
  return (runId: number) => {
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
    void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.runInputsAll(runId) });
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.runExceptionsAll(runId) });
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.runEmployeesAll(runId) });
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.runVariance(runId) });
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.commandCenterAll });
    // Lock/reopen/close change which payees are instructable, so the payout
    // batch list and any open batch sheet are stale too. They hang off
    // `payroll/payout/batches`, not `payroll/runs`, so the prefix above misses
    // them; `bankValidation` does sit under `payroll/runs` and is covered.
    void qc.invalidateQueries({ queryKey: queryKeys.payroll.bankBatches() });
  };
}

export function useLockRun() {
  const invalidateRunWorkspace = useInvalidateRunWorkspace();
  return useAuthorizedMutation<{ success: boolean }, Error, { runId: number }>("payroll:runs:manage", {
    mutationKey: ["payroll", "lock-run"],
    mutationFn: ({ runId }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/lock`),
    onSuccess: (_, { runId }) => invalidateRunWorkspace(runId),
  });
}

export function useReopenRun() {
  const invalidateRunWorkspace = useInvalidateRunWorkspace();
  return useAuthorizedMutation<{ success: boolean }, Error, { runId: number; reason: string }>("payroll:runs:manage", {
    mutationKey: ["payroll", "reopen-run"],
    mutationFn: ({ runId, reason }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/reopen`, { reason }),
    onSuccess: (_, { runId }) => invalidateRunWorkspace(runId),
  });
}

export function useCloseRun() {
  const invalidateRunWorkspace = useInvalidateRunWorkspace();
  return useAuthorizedMutation<{ success: boolean }, Error, { runId: number }>("payroll:runs:manage", {
    mutationKey: ["payroll", "close-run"],
    mutationFn: ({ runId }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/close`),
    onSuccess: (_, { runId }) => invalidateRunWorkspace(runId),
  });
}
