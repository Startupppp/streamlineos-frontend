"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

async function attemptCredentialsSignIn(magicToken: string): Promise<boolean> {
  try {
    const result = await signIn("credentials", {
      magicToken,
      redirect: false,
    });
    if (result?.ok && !result.error) return true;
  } catch {
  }
  try {
    const session = await getSession();
    return Boolean(session?.user);
  } catch {
    return false;
  }
}

export async function signInWithMagicToken(magicToken: string): Promise<boolean> {
  if (!magicToken) return false;
  clearBackendTokenCache();
  if (await attemptCredentialsSignIn(magicToken)) return true;
  return attemptCredentialsSignIn(magicToken);
}

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (variables: { token: string }) =>
      apiClient.post<{ autoLoginToken: string }>("/auth/verify-email", variables),
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: (variables: {
      token: string;
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
