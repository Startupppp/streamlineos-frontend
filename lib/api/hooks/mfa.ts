import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useMfaStatus() {
  return useQuery({
    queryKey: ["mfa", "status"],
    queryFn: () => apiClient.get<{ enabled: boolean }>("/auth/mfa/status"),
  });
}

export function useMfaSetup() {
  return useMutation({
    mutationFn: () =>
      apiClient.post<{ qrDataUrl: string; secret: string; manualEntryKey: string }>("/auth/mfa/setup"),
  });
}

export function useMfaVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<{ enabled: boolean }>("/auth/mfa/verify", { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa"] }),
  });
}

export function useMfaDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (token: string) =>
      apiClient.post<{ disabled: boolean }>("/auth/mfa/disable", { token }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mfa"] }),
  });
}
