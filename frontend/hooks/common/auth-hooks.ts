"use client";

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  clearBackendTokenCache,
  setAutoSignOutSuppressed,
} from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

async function attemptCredentialsSignIn(magicToken: string): Promise<boolean> {
  try {
    const result = await signIn("credentials", {
      magicToken,
      redirect: false,
    });
    if (result?.ok && !result.error) return true;
  } catch {}
  try {
    const session = await getSession();
    return Boolean(session?.user);
  } catch {
    return false;
  }
}

export async function signInWithMagicToken(
  magicToken: string,
): Promise<boolean> {
  if (!magicToken) return false;
  clearBackendTokenCache();
  if (await attemptCredentialsSignIn(magicToken)) return true;
  return attemptCredentialsSignIn(magicToken);
}

export function useVerifyEmail() {
  return useMutation({
    mutationKey: ["auth", "verify-email"],
    mutationFn: (variables: { token: string }) =>
      apiClient.post<{ autoLoginToken: string }>(
        "/auth/verify-email",
        variables,
      ),
  });
}

export function useAcceptInvitation() {
  return useMutation({
    mutationKey: ["auth", "accept-invitation"],
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
    mutationKey: ["auth", "resend-verification"],
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
    mutationKey: ["auth", "sign-out"],
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
  const { status } = useSession();
  return useQuery<OrgSummary[]>({
    queryKey: queryKeys.organization.all,
    queryFn: () => apiClient.get<OrgSummary[]>("/organization"),
    staleTime: 60_000,
    enabled: status === "authenticated",
    placeholderData: keepPreviousData,
  });
}

export function useSwitchOrg() {
  const { update } = useSession();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationKey: ["organization", "switch"],
    mutationFn: (orgId: string) =>
      apiClient.post<{
        orgId: string;
        name: string;
        slug: string;
        role: string;
      }>("/organization/switch", { orgId }),
    onMutate: () => {
      setAutoSignOutSuppressed(true);
    },
    onSuccess: async (data) => {
      clearBackendTokenCache();
      await update({ orgId: data.orgId });
      queryClient.clear();
      router.replace("/dashboard");
      router.refresh();
    },
    onSettled: () => {
      window.setTimeout(() => setAutoSignOutSuppressed(false), 4000);
    },
  });
}
