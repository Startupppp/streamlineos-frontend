"use client";
import type { z } from "zod";
import type { integrationsFinalizeContract as integrationsFinalizeContractDef } from "@/hooks/api/integrations-schema";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { apiClient } from "@/lib/api-client";
import { lazyContract } from "@/lib/api-envelope";
import { directoryAndOwnershipQueryKeys } from "@/lib/query-keys/directory-and-ownership";
import { platformHierarchyQueryKeys } from "@/lib/query-keys/platform-hierarchy";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

const integrationsListContract = lazyContract(() =>
  import("@/hooks/api/integrations-schema").then((m) => m.integrationsListContract),
);
const integrationsInitiateContract = lazyContract(() =>
  import("@/hooks/api/integrations-schema").then((m) => m.integrationsInitiateContract),
);
const integrationsFinalizeContract = lazyContract(() =>
  import("@/hooks/api/integrations-schema").then((m) => m.integrationsFinalizeContract),
);
const integrationsDisconnectContract = lazyContract(() =>
  import("@/hooks/api/integrations-schema").then((m) => m.integrationsDisconnectContract),
);
const integrationsSetPrimaryContract = lazyContract(() =>
  import("@/hooks/api/integrations-schema").then((m) => m.integrationsSetPrimaryContract),
);

export type IntegrationToolkit = "googlecalendar" | "outlook" | "gmail";
export type IntegrationConnectionStatus = "active" | "needs_reauth" | "disabled";

export type IntegrationConnection = z.infer<typeof integrationsFinalizeContractDef>;

export function useIntegrationConnections(options?: { enabled?: boolean }) {
  return useGatedQuery("integrations:connections:view", {
    queryKey: platformHierarchyQueryKeys.integrations.connections(),
    queryFn: ({ signal }) => apiClient.get<IntegrationConnection[]>("/integrations/connections", undefined, signal, integrationsListContract),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useInitiateIntegrationConnection() {
  return useAuthorizedMutation("integrations:connections:manage", {
    mutationKey: ["integrations", "connections", "initiate"],
    mutationFn: ({ toolkit, returnPath }: { toolkit: IntegrationToolkit; returnPath?: string }) =>
      apiClient.post<{ redirectUrl: string }>("/integrations/connections/initiate", {
        toolkit,
        ...(returnPath !== undefined && { returnPath }),
      }, undefined, integrationsInitiateContract),
  });
}

export function useFinalizeIntegrationConnection() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:connections:manage", {
    mutationKey: ["integrations", "connections", "finalize"],
    mutationFn: (connectedAccountId: string) =>
      apiClient.post<IntegrationConnection>("/integrations/connections/finalize", { connectedAccountId }, undefined, integrationsFinalizeContract),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.integrations.connections(),
        exact: true,
      });
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.mail.all });
    },
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:connections:manage", {
    mutationKey: ["integrations", "connections", "disconnect"],
    mutationFn: (connectionId: number) =>
      apiClient.delete<{ deleted: boolean }>(`/integrations/connections/${connectionId}`, undefined, undefined, integrationsDisconnectContract),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.integrations.connections(),
        exact: true,
      });
      void qc.invalidateQueries({ queryKey: platformHierarchyQueryKeys.calendar.all });
      void qc.invalidateQueries({ queryKey: directoryAndOwnershipQueryKeys.mail.all });
    },
  });
}

export function useSetPrimaryIntegration() {
  const qc = useQueryClient();
  return useAuthorizedMutation("integrations:connections:manage", {
    mutationKey: ["integrations", "connections", "set-primary"],
    mutationFn: (connectionId: number) =>
      apiClient.patch<IntegrationConnection>(`/integrations/connections/${connectionId}/primary`, {}, undefined, integrationsSetPrimaryContract),
    onSuccess: () => {
      void qc.invalidateQueries({
        queryKey: platformHierarchyQueryKeys.integrations.connections(),
        exact: true,
      });
    },
  });
}
