"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import type { AgentToken, CreateAgentTokenResponse } from "@/types/projects/agent-tokens";

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
    queryFn: ({ signal }) =>
      apiClient.get<{ tools: CrmMcpTool[] }>("/crm/mcp/tools", undefined, signal),
    enabled: canViewTokens,
    staleTime: 60_000,
  });
}

export function useCrmAgentTokens() {
  const canViewTokens = useCan("settings:api-tokens:read");
  return useQuery<AgentToken[]>({
    queryKey: queryKeys.crmSettings.mcpAgentTokens(),
    queryFn: ({ signal }) => apiClient.get<AgentToken[]>("/agent-tokens", undefined, signal),
    enabled: canViewTokens,
    staleTime: 60_000,
  });
}

export function useCreateCrmAgentToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
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
  return useAuthorizedMutation("settings:api-tokens:write", {
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

/**
 * Whether this organisation lets agents drive the CRM at all.
 *
 * A different question from every permission on this page. Those answer "may
 * this caller run this tool"; this one answers whether the organisation wants a
 * machine touching its customer records — and a per-tool key cannot express it,
 * because an admin holds `crm:deals:read` because they read deals, not because
 * they consented to an agent reading them.
 *
 * It pairs with the token keys rather than a CRM key, matching the controller:
 * the authority that mints the credentials this surface accepts is the one that
 * decides whether the surface exists.
 */
export interface CrmMcpAccess {
  organizationId: string;
  enabled: boolean;
  updatedByUserId: string | null;
  updatedAt: string | null;
}

export function useCrmMcpAccess() {
  const canViewTokens = useCan("settings:api-tokens:read");
  return useQuery<CrmMcpAccess>({
    queryKey: queryKeys.crmSettings.mcpAccess(),
    queryFn: ({ signal }) => apiClient.get<CrmMcpAccess>("/crm/settings/mcp", undefined, signal),
    enabled: canViewTokens,
    staleTime: 60_000,
  });
}

export function useSetCrmMcpAccess() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["crm", "mcp", "access", "set"],
    mutationFn: (enabled: boolean) =>
      apiClient.put<CrmMcpAccess>("/crm/settings/mcp", { enabled }),
    onSuccess: (data) => {
      qc.setQueryData(queryKeys.crmSettings.mcpAccess(), data);
      /** Turning it off empties the tool catalogue, so that read is now stale. */
      void qc.invalidateQueries({ queryKey: queryKeys.crmSettings.mcpTools() });
    },
  });
}
