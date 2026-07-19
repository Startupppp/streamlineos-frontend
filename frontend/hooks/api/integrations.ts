"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type IntegrationToolkit = "googlecalendar" | "outlook" | "gmail";
export type IntegrationConnectionStatus = "active" | "needs_reauth" | "disabled";

export interface IntegrationConnection {
  id: number;
  toolkit: IntegrationToolkit;
  accountEmail: string | null;
  accountLabel: string | null;
  status: IntegrationConnectionStatus;
  isPrimary: boolean;
  createdAt: string;
}

export function useIntegrationConnections() {
  return useQuery({
    queryKey: queryKeys.integrations.connections(),
    queryFn: () => apiClient.get<IntegrationConnection[]>("/integrations/connections"),
    staleTime: 60_000,
  });
}

export function useInitiateIntegrationConnection() {
  return useMutation({
    mutationKey: ["integrations", "connections", "initiate"],
    mutationFn: ({ toolkit, returnPath }: { toolkit: IntegrationToolkit; returnPath?: string }) =>
      apiClient.post<{ redirectUrl: string }>("/integrations/connections/initiate", {
        toolkit,
        ...(returnPath !== undefined && { returnPath }),
      }),
  });
}

export function useFinalizeIntegrationConnection() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["integrations", "connections", "finalize"],
    mutationFn: (connectedAccountId: string) =>
      apiClient.post<IntegrationConnection>("/integrations/connections/finalize", { connectedAccountId }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useDisconnectIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["integrations", "connections", "disconnect"],
    mutationFn: (connectionId: number) =>
      apiClient.delete<{ deleted: boolean }>(`/integrations/connections/${connectionId}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
      void qc.invalidateQueries({ queryKey: queryKeys.calendar.all });
    },
  });
}

export function useSetPrimaryIntegration() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["integrations", "connections", "set-primary"],
    mutationFn: (connectionId: number) =>
      apiClient.patch<IntegrationConnection>(`/integrations/connections/${connectionId}/primary`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.integrations.all });
    },
  });
}
