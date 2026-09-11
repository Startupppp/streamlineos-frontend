"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { useCan } from "@/hooks/api/access";
import type { WorkflowVariable } from "./workflows-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const noContentContract = lazyContract(() =>
  import("@/hooks/api/cursor-page-schema").then((m) => m.noContentContract),
);
const workflowVariableListContract = lazyContract(() =>
  import("@/hooks/api/workflows-schema").then((m) => m.workflowVariableListContract),
);


function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function useGlobalVariables() {
  const canManage = useCan("workflows:variables:manage");
  return useQuery({
    queryKey: [...supportAndWorkflowsQueryKeys.workflows.all, "global-variables"] as const,
    queryFn: ({ signal }) => apiClient.get<WorkflowVariable[]>("/workflows/variables", undefined, signal, workflowVariableListContract),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useDeleteGlobalVariable() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:variables:manage");
  return useAuthorizedMutation("workflows:variables:manage", {
    mutationKey: ["delete", "global", "variable"],
    mutationFn: (variableId: string) => {
      assertPermission(canManage);
      return apiClient.delete<void>(`/workflows/variables/${variableId}`, undefined, undefined, noContentContract);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...supportAndWorkflowsQueryKeys.workflows.all, "global-variables"] }),
  });
}
