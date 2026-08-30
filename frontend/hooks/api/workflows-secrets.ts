"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { WorkflowSecret } from "./workflows-types";

interface CreateSecretInput {
  name: string;
  value: string;
  description?: string;
}

function assertPermission(allowed: boolean): void {
  if (!allowed) throw new Error("You do not have permission for this workflow action.");
}

export function useGlobalSecrets() {
  const canManage = useCan("workflows:secrets:manage");
  return useQuery({
    queryKey: [...queryKeys.workflows.all, "global-secrets"] as const,
    queryFn: () => apiClient.get<WorkflowSecret[]>("/workflows/secrets"),
    staleTime: 30_000,
    enabled: canManage,
  });
}

export function useWorkflowSecrets(workflowId: string) {
  const canManage = useCan("workflows:secrets:manage");
  return useQuery({
    queryKey: queryKeys.workflows.secrets(workflowId),
    queryFn: () => apiClient.get<WorkflowSecret[]>(`/workflows/${workflowId}/secrets`),
    staleTime: 30_000,
    enabled: canManage && workflowId.length > 0,
  });
}

export function useCreateGlobalSecret() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:secrets:manage");
  return useMutation({
    mutationKey: ["create", "global", "secret"],
    mutationFn: (input: CreateSecretInput) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowSecret>("/workflows/secrets", input);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.workflows.all, "global-secrets"] }),
  });
}

export function useCreateWorkflowSecret(workflowId: string) {
  const qc = useQueryClient();
  const canManage = useCan("workflows:secrets:manage");
  return useMutation({
    mutationKey: ["create", "workflow", "secret", workflowId],
    mutationFn: (input: CreateSecretInput) => {
      assertPermission(canManage);
      return apiClient.post<WorkflowSecret>(`/workflows/${workflowId}/secrets`, input);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.workflows.secrets(workflowId) }),
  });
}

export function useDeleteGlobalSecret() {
  const qc = useQueryClient();
  const canManage = useCan("workflows:secrets:manage");
  return useMutation({
    mutationKey: ["delete", "global", "secret"],
    mutationFn: (secretId: string) => {
      assertPermission(canManage);
      return apiClient.delete<{ success: boolean }>(`/workflows/secrets/${secretId}`);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: [...queryKeys.workflows.all, "global-secrets"] }),
  });
}

export function useDeleteWorkflowSecret(workflowId: string) {
  const qc = useQueryClient();
  const canManage = useCan("workflows:secrets:manage");
  return useMutation({
    mutationKey: ["delete", "workflow", "secret", workflowId],
    mutationFn: (secretId: string) => {
      assertPermission(canManage);
      return apiClient.delete<{ success: boolean }>(
        `/workflows/${workflowId}/secrets/${secretId}`,
      );
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: queryKeys.workflows.secrets(workflowId) }),
  });
}
