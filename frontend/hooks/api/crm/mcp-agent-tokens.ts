"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { AgentToken, CreateAgentTokenResponse } from "@/types/projects";

export interface CrmMcpTool {
  name: string;
  description: string;
  requiredPermission: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface CreateCrmAgentTokenPayload {
  name: string;
  expiresInDays?: number;
  scopes: string[];
}

export function useCrmMcpTools() {
  const canViewTokens = useCan("settings:api-tokens:read");
  return useQuery<{ tools: CrmMcpTool[] }>({
    queryKey: queryKeys.crmSettings.mcpTools(),
    queryFn: () => apiClient.get<{ tools: CrmMcpTool[] }>("/crm/mcp/tools"),
    enabled: canViewTokens,
    staleTime: 60_000,
  });
}

export function useCrmAgentTokens() {
  const canViewTokens = useCan("settings:api-tokens:read");
  return useQuery<AgentToken[]>({
    queryKey: queryKeys.crmSettings.mcpAgentTokens(),
    queryFn: () => apiClient.get<AgentToken[]>("/agent-tokens"),
    enabled: canViewTokens,
    staleTime: 60_000,
  });
}

export function useCreateCrmAgentToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "mcp", "agent-tokens", "create"],
    mutationFn: (data: CreateCrmAgentTokenPayload) =>
      apiClient.post<CreateAgentTokenResponse>("/agent-tokens", data),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.crmSettings.mcpAgentTokens(),
      });
    },
  });
}

export function useRevokeCrmAgentToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["crm", "mcp", "agent-tokens", "revoke"],
    mutationFn: (tokenId: string | number) =>
      apiClient.delete<void>(`/agent-tokens/${tokenId}`),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: queryKeys.crmSettings.mcpAgentTokens(),
      });
    },
  });
}
