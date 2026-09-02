"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { WorkflowVariable } from "./workflows-types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function useGlobalVariables() {
  const canManage = useCan("workflows:variables:manage");
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "global-variables"] as const,
    queryFn: ({ signal }) => apiClient.get<WorkflowVariable[]>("/workflows/variables", undefined, signal),
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
      return apiClient.delete<{ success: boolean }>(`/workflows/variables/${variableId}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.workflows.all, "global-variables"] }),
  });
}
