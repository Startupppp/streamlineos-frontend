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
import { clearGateCookies } from "@/lib/onboarding-gate";
import { getErrorMessage } from "@/lib/get-error-message";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "sonner";

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
  // Do not retry credentials sign-in with the same token: magic-link verify
  // consumes it on first success, so a second attempt always fails.
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

export function useDeclineInvitation() {
  return useMutation({
    mutationKey: ["auth", "decline-invitation"],
    mutationFn: (variables: { token: string }) =>
      apiClient.post<{ ok: true }>(
        "/organization/invitations/decline",
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
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["auth", "sign-out"],
    mutationFn: async () => {
      try {
        await apiClient.post("/auth/logout", undefined);
      } catch {}
      clearBackendTokenCache();
      queryClient.clear();
      return signOut({ redirect: false });
    },
    onSuccess: () => {
      clearGateCookies();
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

export function useGetOrganizations(enabled = true) {
  const { status } = useSession();
  return useQuery<OrgSummary[]>({
    queryKey: queryKeys.organization.all,
    queryFn: () => apiClient.get<OrgSummary[]>("/organization"),
    staleTime: 60_000,
    enabled: status === "authenticated" && enabled,
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
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
      clearGateCookies();
    },
    onSuccess: async (data) => {
      clearBackendTokenCache();
      await update({ orgId: data.orgId });
      queryClient.clear();
      router.replace("/dashboard");
      router.refresh();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSettled: () => {
      window.setTimeout(() => setAutoSignOutSuppressed(false), 4000);
    },
  });
}
