"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  PayrollApprovalRow,
  SubmitApprovalResult,
  ApproveStageResult,
} from "@/types/payroll";

export function useRunApprovals(runId: number) {
  return useQuery<PayrollApprovalRow[]>({
    queryKey: queryKeys.payroll.runApprovals(runId),
    queryFn: () => apiClient.get<PayrollApprovalRow[]>(`/payroll/runs/${runId}/approvals`),
    staleTime: 30_000,
    enabled: runId > 0,
  });
}

export function useSubmitApproval() {
  const qc = useQueryClient();
  return useMutation<SubmitApprovalResult, Error, { runId: number }>({
    mutationKey: ["payroll", "submit-approval"],
    mutationFn: ({ runId }) =>
      apiClient.post<SubmitApprovalResult>(`/payroll/runs/${runId}/submit-approval`),
    onSuccess: (_data, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}

export function useApproveStage() {
  const qc = useQueryClient();
  return useMutation<
    ApproveStageResult,
    Error,
    { runId: number; approvalId: number; comment?: string }
  >({
    mutationKey: ["payroll", "approve-stage"],
    mutationFn: ({ runId, approvalId, comment }) =>
      apiClient.post<ApproveStageResult>(
        `/payroll/runs/${runId}/approvals/${approvalId}/approve`,
        { comment },
      ),
    onSuccess: (_data, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}

export function useRejectStage() {
  const qc = useQueryClient();
  return useMutation<
    ApproveStageResult,
    Error,
    { runId: number; approvalId: number; comment: string }
  >({
    mutationKey: ["payroll", "reject-stage"],
    mutationFn: ({ runId, approvalId, comment }) =>
      apiClient.post<ApproveStageResult>(
        `/payroll/runs/${runId}/approvals/${approvalId}/reject`,
        { comment },
      ),
    onSuccess: (_data, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}

export function useLockRun() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, { runId: number }>({
    mutationKey: ["payroll", "lock-run"],
    mutationFn: ({ runId }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/lock`),
    onSuccess: (_data, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}

export function useReopenRun() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, { runId: number; reason: string }>({
    mutationKey: ["payroll", "reopen-run"],
    mutationFn: ({ runId, reason }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/reopen`, { reason }),
    onSuccess: (_data, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}

export function useCloseRun() {
  const qc = useQueryClient();
  return useMutation<{ success: boolean }, Error, { runId: number }>({
    mutationKey: ["payroll", "close-run"],
    mutationFn: ({ runId }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/close`),
    onSuccess: (_data, { runId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...queryKeys.payroll.all, "runs"] });
    },
  });
}
