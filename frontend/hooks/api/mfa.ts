"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { supportAndWorkflowsQueryKeys } from "@/lib/query-keys/support-and-workflows";
import { lazyContract } from "@/lib/api-envelope";

const mfaStatusContract = lazyContract(() =>
  import("@/hooks/api/auth-schema").then((m) => m.mfaStatusContract),
);
const mfaSetupContract = lazyContract(() =>
  import("@/hooks/api/auth-schema").then((m) => m.mfaSetupContract),
);
const mfaVerifyContract = lazyContract(() =>
  import("@/hooks/api/auth-schema").then((m) => m.mfaVerifyContract),
);
const mfaDisableContract = lazyContract(() =>
  import("@/hooks/api/auth-schema").then((m) => m.mfaDisableContract),
);
const mfaChallengeContract = lazyContract(() =>
  import("@/hooks/api/auth-schema").then((m) => m.mfaChallengeContract),
);

export function useMfaStatus() {
  return useQuery({
    queryKey: supportAndWorkflowsQueryKeys.mfa.status(),
    queryFn: ({ signal }) => apiClient.get<{ enabled: boolean }>("/auth/mfa/status", undefined, signal, mfaStatusContract),
    staleTime: 2 * 60_000,
    // SETTINGS-001: see `useSessions`. `MfaSettings` branches on `isError`, so a
    // failed read says so rather than taking Account Settings down — and never
    // reports MFA as off on a read it did not get.
    ...INLINE_READ_ERROR,
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
      }>("/auth/mfa/setup", undefined, undefined, mfaSetupContract),
  });
}

export function useMfaVerify() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["mfa", "verify"],
    mutationFn: (data: { token: string } | { backupCode: string }) =>
      apiClient.post<{ enabled: boolean }>("/auth/mfa/verify", data, undefined, mfaVerifyContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.mfa.all });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
    },
  });
}

export function useMfaChallenge() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["mfa", "challenge"],
    mutationFn: (data: { token: string } | { backupCode: string }) =>
      apiClient.post<{ satisfied: true }>("/auth/mfa/challenge", data, undefined, mfaChallengeContract),
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
      apiClient.post<{ disabled: boolean }>("/auth/mfa/disable", { token }, undefined, mfaDisableContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: supportAndWorkflowsQueryKeys.mfa.all });
      qc.invalidateQueries({ queryKey: platformCoreQueryKeys.access.me() });
    },
  });
}

