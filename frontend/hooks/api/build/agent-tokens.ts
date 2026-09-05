"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { AgentToken, CreateAgentTokenResponse } from "@/types/projects";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export type { AgentToken, CreateAgentTokenResponse } from "@/types/projects";

export function useAgentTokens() {
  const canView = useCan("settings:api-tokens:read");
  return useQuery<AgentToken[]>({
    queryKey: buildWorkQueryKeys.projects.agentTokens(),
    queryFn: ({ signal }) => apiClient.get<AgentToken[]>("/agent-tokens", undefined, signal),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreateAgentToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["projects", "agent-tokens", "create"],
    mutationFn: (data: { name: string; expiresInDays?: number }) =>
      apiClient.post<CreateAgentTokenResponse>("/agent-tokens", data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentTokens() });
    },
  });
}

export function useRevokeAgentToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["projects", "agent-tokens", "revoke"],
    mutationFn: (tokenId: string) =>
      apiClient.delete<{ success: boolean }>(`/agent-tokens/${tokenId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentTokens() });
    },
  });
}
