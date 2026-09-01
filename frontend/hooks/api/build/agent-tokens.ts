"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AgentToken, CreateAgentTokenResponse } from "@/types/projects";

export type { AgentToken, CreateAgentTokenResponse } from "@/types/projects";

export function useAgentTokens() {
  const canView = useCan("settings:api-tokens:read");
  return useQuery<AgentToken[]>({
    queryKey: queryKeys.projects.agentTokens(),
    queryFn: ({ signal }) => apiClient.get<AgentToken[]>("/agent-tokens", undefined, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreateAgentToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "agent-tokens", "create"],
    mutationFn: (data: { name: string; expiresInDays?: number }) =>
      apiClient.post<CreateAgentTokenResponse>("/agent-tokens", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.agentTokens() });
    },
  });
}

export function useRevokeAgentToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["projects", "agent-tokens", "revoke"],
    mutationFn: (tokenId: string) =>
      apiClient.delete<{ success: boolean }>(`/agent-tokens/${tokenId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.projects.agentTokens() });
    },
  });
}
