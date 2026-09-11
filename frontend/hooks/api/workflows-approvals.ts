"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import type { WorkflowApproval } from "./workflows-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const workflowPendingApprovalsContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowPendingApprovalsContract),
);
const workflowApprovalActionContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowApprovalActionContract),
);


interface ApprovalActionInput {
  action: "approve" | "reject";
  comment?: string;
}

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function usePendingApprovals() {
  const canView = useCan("workflows:approvals:view");
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.workflows.approvals(),
    queryFn: ({ signal }) => apiClient.get<WorkflowApproval[]>("/workflows/approvals/pending", undefined, signal, workflowPendingApprovalsContract),
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    enabled: canView,
  });
}

export function useHandleApproval() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:approvals:manage");
  return useAuthorizedMutation("workflows:approvals:manage", {
    mutationKey: ["handle", "approval"],
    mutationFn: ({ approvalId, ...input }: ApprovalActionInput & { approvalId: string }) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowApproval>(`/workflows/approvals/${approvalId}/action`, input, undefined, workflowApprovalActionContract);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.approvals() });
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.workflows.all });
    },
  });
}
