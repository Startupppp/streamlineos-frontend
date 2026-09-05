"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";

export function useMfaStatus() {
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.mfa.status(),
    queryFn: ({ signal }) => apiClient.get<{ enabled: boolean }>("/auth/mfa/status", undefined, signal),
    staleTime: 2 * 60_000,
  });
}

export function useMfaSetup() {
  return useMutation({
    mutationKey: ["mfa", "setup"],
    mutationFn: () =>
      apiClient.post<{
        qrDataUrl: string;
        secret: string;
        manualEntryKey: string;
        backupCodes: string[];
      }>("/auth/mfa/setup"),
  });
}

export function useMfaVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["mfa", "verify"],
    mutationFn: (data: { token: string } | { backupCode: string }) =>
      apiClient.post<{ enabled: boolean }>("/auth/mfa/verify", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.mfa.all });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
    },
  });
}

export function useMfaDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["mfa", "disable"],
    mutationFn: (token: string) =>
      apiClient.post<{ disabled: boolean }>("/auth/mfa/disable", { token }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.mfa.all });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
    },
  });
}

