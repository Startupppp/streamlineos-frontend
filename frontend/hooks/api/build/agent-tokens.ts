"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { buildWorkQueryKeys } from "@/lib/query-keys/build-work";
import { useCan } from "@/hooks/api/access";
import type { AgentToken, CreateAgentTokenResponse } from "@/hooks/api/build/agent-tokens-schema";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";


const agentTokenListContract = lazyContract(() =>
  import("@/hooks/api/build/agent-tokens-schema").then((m) => m.agentTokenListContract),
);
const agentTokenCreateContract = lazyContract(() =>
  import("@/hooks/api/build/agent-tokens-schema").then((m) => m.agentTokenCreateContract),
);
const agentTokenSuccessContract = lazyContract(() =>
  import("@/hooks/api/build/agent-tokens-schema").then((m) => m.agentTokenSuccessContract),
);

export type { AgentToken, CreateAgentTokenResponse } from "@/hooks/api/build/agent-tokens-schema";

export function useAgentTokens() {
  const canView = useCan("settings:api-tokens:read");
  return useQuery<AgentToken[]>({
    queryKey: buildWorkQueryKeys.projects.agentTokens(),
    queryFn: ({ signal }) => apiClient.get<AgentToken[]>("/agent-tokens", undefined, signal, agentTokenListContract),
    enabled: canView,
    staleTime: 60_000,
  });
}

export function useCreateAgentToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["projects", "agent-tokens", "create"],
    mutationFn: (data: { name: string; expiresInDays?: number }) =>
      apiClient.post<CreateAgentTokenResponse>("/agent-tokens", data, undefined, agentTokenCreateContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentTokens() });
    },
  });
}

export function useRevokeAgentToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["projects", "agent-tokens", "revoke"],
    mutationFn: (tokenId: number) =>
      apiClient.delete<{ success: boolean }>(`/agent-tokens/${tokenId}`, agentTokenSuccessContract),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: buildWorkQueryKeys.projects.agentTokens() });
    },
  });
}
