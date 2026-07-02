"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (variables: { token: string }) =>
      apiClient.post<{ autoLoginToken: string }>("/auth/verify-email", variables),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (variables: { email: string }) =>
      apiClient.post<{ message: string }>("/auth/forgot-password", variables),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (variables: { token: string; password: string }) =>
      apiClient.post<{ message: string }>("/auth/reset-password", {
        token: variables.token,
        newPassword: variables.password,
      }),
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (variables: {
      token: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    }) =>
      apiClient.post<{ autoLoginToken?: string }>(
        "/organization/invitations/accept",
        variables,
      ),
  });
}

export function useResendVerificationEmail() {
  return useMutation({
    mutationFn: (variables: { email: string }) =>
      apiClient.post<{ success: boolean }>(
        "/auth/resend-verification",
        variables,
      ),
  });
}

export function useSignOut() {
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post("/auth/logout", undefined);
      } catch {}
      clearBackendTokenCache();
      return signOut({ redirect: false });
    },
    onSuccess: () => {
      router.push("/signin");
      router.refresh();
    },
  });
}

type OrgSummary = {
  id: string;
  name: string;
  slug: string;
  role: string;
  joinedAt: string | null;
};

export function useGetOrganizations() {
  const { data: session } = useSession();
  const orgId = session?.orgId;
  return useQuery<OrgSummary[]>({
    queryKey: queryKeys.organization.all,
    queryFn: () => apiClient.get<OrgSummary[]>("/organization"),
    staleTime: 60_000,
    enabled: !!orgId,
  });
}

export function useSwitchOrg() {
  const { update } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orgId: string) =>
      apiClient.post<{
        orgId: string;
        name: string;
        slug: string;
        role: string;
      }>("/organization/switch", { orgId }),
    onSuccess: async (data) => {
      clearBackendTokenCache();
      await update({ orgId: data.orgId });
      queryClient.clear();
      window.location.href = "/dashboard";
    },
  });
}
