"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { WorkflowApproval } from "./workflows-types";

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
    queryKey: queryKeys.workflows.approvals(),
    queryFn: ({ signal }) => apiClient.get<WorkflowApproval[]>("/workflows/approvals/pending", undefined, signal),
    staleTime: 120_000,
    refetchInterval: 120_000,
    refetchIntervalInBackground: false,
    enabled: canView,
  });
}

export function useHandleApproval() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:approvals:manage");
  return useMutation({
    mutationKey: ["handle", "approval"],
    mutationFn: ({ approvalId, ...input }: ApprovalActionInput & { approvalId: string }) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowApproval>(`/workflows/approvals/${approvalId}/action`, input);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.workflows.approvals() });
      qc.invalidateQueries({ queryKey: queryKeys.workflows.all });
    },
  });
}
