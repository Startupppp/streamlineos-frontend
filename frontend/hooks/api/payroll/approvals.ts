"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { lazyContract } from "@/lib/api-envelope";
import { payrollQueryKeys } from "@/lib/query-keys/payroll";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type {
  ApprovalList,
  SubmitApprovalResult,
  ApproveStageResult,
} from "@/hooks/api/payroll/approvals-schema";
import {
  payrollRunStatusContract,
  type PayrollRunStatus,
} from "@/hooks/api/payroll/runs-schema";

function withSubmittedRunStatus(current: unknown, runId: number, status: PayrollRunStatus): unknown {
  if (!current || typeof current !== "object") return current;
  const record = current as {
    run?: { id?: number };
    data?: Array<Record<string, unknown>>;
  };
  if (record.run && record.run.id === runId) {
    return { ...record, run: { ...record.run, status } };
  }
  if (!Array.isArray(record.data) || record.data.length === 0) return current;
  if (record.data.some((row) => row && typeof row === "object" && "stageName" in row)) return current;
  let changed = false;
  const data = record.data.map((row) => {
    if (row && row.id === runId && "month" in row) {
      changed = true;
      return { ...row, status };
    }
    return row;
  });
  return changed ? { ...record, data } : current;
}

const approvalListC = lazyContract(() =>
  import("@/hooks/api/payroll/approvals-schema").then((m) => m.approvalListContract),
);
const submitApprovalResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/approvals-schema").then((m) => m.submitApprovalResponseContract),
);
const approvalActionResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/approvals-schema").then((m) => m.approvalActionResponseContract),
);
const lockResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/approvals-schema").then((m) => m.lockResponseContract),
);
const reopenResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/approvals-schema").then((m) => m.reopenResponseContract),
);
const closeResponseC = lazyContract(() =>
  import("@/hooks/api/payroll/approvals-schema").then((m) => m.closeResponseContract),
);

export function useRunApprovals(runId: number, options?: { enabled?: boolean }) {
  const canView = useCan("payroll:runs:view");
  return useQuery<ApprovalList>({
    queryKey: payrollQueryKeys.payroll.runApprovals(runId),
    queryFn: ({ signal }) => apiClient.get<ApprovalList>(`/payroll/runs/${runId}/approvals`, undefined, signal, approvalListC),
    staleTime: 30_000,
    enabled: canView && runId > 0 && (options?.enabled ?? true),
    ...INLINE_READ_ERROR,
  });
}

function rememberRunStatus(
  qc: ReturnType<typeof useQueryClient>,
  runId: number,
  runStatus: string,
) {
  const parsedStatus = payrollRunStatusContract.safeParse(runStatus);
  if (!parsedStatus.success) return;
  const status = parsedStatus.data;
  void qc.cancelQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
  qc.setQueryData(payrollQueryKeys.payroll.run(runId), (current) =>
    withSubmittedRunStatus(current, runId, status),
  );
  qc.setQueriesData({ queryKey: payrollQueryKeys.payroll.runs() }, (current) =>
    withSubmittedRunStatus(current, runId, status),
  );
}

export function useSubmitApproval() {
  const qc = useQueryClient();
  return useAuthorizedMutation<SubmitApprovalResult, Error, { runId: number }>("payroll:runs:update", {
    mutationKey: ["payroll", "submit-approval"],
    mutationFn: ({ runId }) =>
      apiClient.post<SubmitApprovalResult>(`/payroll/runs/${runId}/submit-approval`, undefined, undefined, submitApprovalResponseC),
    onSuccess: (result, { runId }) => {
      rememberRunStatus(qc, runId, result.runStatus);
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "runs"] });
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
        undefined,
        approvalActionResponseC,
      ),
    onSuccess: (result, { runId }) => {
      rememberRunStatus(qc, runId, result.runStatus);
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "runs"] });
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
        undefined,
        approvalActionResponseC,
      ),
    onSuccess: (result, { runId }) => {
      rememberRunStatus(qc, runId, result.runStatus);
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runApprovals(runId) });
      void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
      void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "runs"] });
    },
  });
}

function useInvalidateRunWorkspace() {
  const qc = useQueryClient();
  return (runId: number) => {
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.run(runId) });
    void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "runs"] });
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runInputsAll(runId) });
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runExceptionsAll(runId) });
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runEmployeesAll(runId) });
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.runVariance(runId) });
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.commandCenterAll });
    void qc.invalidateQueries({ queryKey: payrollQueryKeys.payroll.bankBatches() });
    void qc.invalidateQueries({ queryKey: [...payrollQueryKeys.payroll.all, "reports"] });
  };
}

export function useLockRun() {
  const invalidateRunWorkspace = useInvalidateRunWorkspace();
  return useAuthorizedMutation<{ success: boolean }, Error, { runId: number }>("payroll:runs:manage", {
    mutationKey: ["payroll", "lock-run"],
    mutationFn: ({ runId }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/lock`, undefined, undefined, lockResponseC),
    onSuccess: (_, { runId }) => invalidateRunWorkspace(runId),
  });
}

export function useReopenRun() {
  const qc = useQueryClient();
  const invalidateRunWorkspace = useInvalidateRunWorkspace();
  return useAuthorizedMutation<{ success: boolean }, Error, { runId: number; reason: string }>("payroll:runs:manage", {
    mutationKey: ["payroll", "reopen-run"],
    mutationFn: ({ runId, reason }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/reopen`, { reason }, undefined, reopenResponseC),
    onSuccess: (_, { runId }) => {
      rememberRunStatus(qc, runId, "REOPENED");
      invalidateRunWorkspace(runId);
    },
  });
}

export function useCloseRun() {
  const invalidateRunWorkspace = useInvalidateRunWorkspace();
  return useAuthorizedMutation<{ success: boolean }, Error, { runId: number }>("payroll:runs:manage", {
    mutationKey: ["payroll", "close-run"],
    mutationFn: ({ runId }) =>
      apiClient.post<{ success: boolean }>(`/payroll/runs/${runId}/close`, undefined, undefined, closeResponseC),
    onSuccess: (_, { runId }) => invalidateRunWorkspace(runId),
  });
}
