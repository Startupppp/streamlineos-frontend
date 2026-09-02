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
    queryFn: ({ signal }) => apiClient.get<WorkflowSecret[]>("/workflows/secrets", undefined, signal),
    staleTime: 30_000,
    enabled: canManage,
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

