"use client";

import { useCallback } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Session } from "next-auth";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  apiClient,
  clearBackendTokenCache,
  setAutoSignOutSuppressed,
} from "@/lib/api-client";
import { clearGateCookies } from "@/lib/onboarding-gate";
import { getErrorMessage } from "@/lib/get-error-message";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { lazyContract } from "@/lib/api-envelope";
import type { UserOrganization } from "@/hooks/api/organization-schema";
import { toast } from "sonner";

/**
 * Deferred: the org switcher in the shell header imports this module, so a
 * value import here reached Zod from every authenticated route. Both are still
 * handed to the seam in the contract slot — `POST /organization/switch` in
 * particular sets the session's active org, and failing it open is a
 * cross-tenant outcome, so its contract is not optional.
 */
const organizationsContract = lazyContract(() =>
  import("@/hooks/api/organization-schema").then(
    (m) => m.userOrganizationsContract,
  ),
);
const switchOrgContract = lazyContract(() =>
  import("@/hooks/api/organization-schema").then(
    (m) => m.switchOrgResultContract,
  ),
);
const verifyEmailContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.verifyEmailContract),
);
const invitationValidateContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.invitationValidateContract),
);
const acceptInvitationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.acceptInvitationContract),
);
const declineInvitationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.declineInvitationContract),
);
const resendVerificationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.resendVerificationContract),
);
const logoutContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.logoutContract),
);

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
        undefined,
        verifyEmailContract,
      ),
  });
}

export interface InvitationValidation {
  email: string;
  organizationName: string;
  role: string;
  userExists: boolean;
}

export function useValidateInvitation(token: string) {
  return useQuery<InvitationValidation>({
    queryKey: platformCoreQueryKeys.invitation.token(token),
    queryFn: ({ signal }) =>
      apiClient.get("/organization/invitations/validate", { token }, signal, invitationValidateContract),
    staleTime: 60_000,
    enabled: !!token,
    retry: false,
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
      apiClient.post<{ ok: true; autoLoginToken: string }>(
        "/organization/invitations/accept",
        variables,
        undefined,
        acceptInvitationContract,
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
        undefined,
        declineInvitationContract,
      ),
  });
}

export function useResendVerificationEmail() {
  return useMutation({
    mutationKey: ["auth", "resend-verification"],
    mutationFn: (variables: { email: string }) =>
      apiClient.post<{ message: string }>(
        "/auth/resend-verification",
        variables,
        undefined,
        resendVerificationContract,
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
        await apiClient.post("/auth/logout", undefined, undefined, logoutContract);
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

export function useGetOrganizations(enabled = true) {
  const { status } = useSession();
  return useQuery<UserOrganization[]>({
    queryKey: platformCoreQueryKeys.organization.all,
    queryFn: ({ signal }) =>
      apiClient.get("/organization", undefined, signal, organizationsContract),
    staleTime: 60_000,
    enabled: status === "authenticated" && enabled,
    placeholderData: keepPreviousData,
    refetchOnMount: "always",
    refetchOnWindowFocus: "always",
  });
}

export function useGoogleSignIn(getCallbackUrl: () => string) {
  return useMutation({
    mutationKey: ["auth", "sign-in", "google"],
    mutationFn: async () => {
      await signIn("google", { callbackUrl: getCallbackUrl() });
    },
    onError: () => {
      toast.error("Google sign-in failed. Please try again.");
    },
  });
}

export function useMicrosoftSignIn(getCallbackUrl: () => string) {
  return useMutation({
    mutationKey: ["auth", "sign-in", "microsoft"],
    mutationFn: async () => {
      await signIn("microsoft-entra-id", { callbackUrl: getCallbackUrl() });
    },
    onError: () => {
      toast.error("Microsoft sign-in failed. Please try again.");
    },
  });
}

const CLAIM_REFRESH_TIMEOUT_MS = 18_000;

export type SessionClaimsRefresh = (data?: unknown) => Promise<Session | null>;

export function useSessionClaimsRefresh(): SessionClaimsRefresh {
  const { update } = useSession();
  return useCallback(
    (data?: unknown) => {
      clearBackendTokenCache();
      return Promise.race([
        update(data).catch(() => null),
        new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), CLAIM_REFRESH_TIMEOUT_MS);
        }),
      ]);
    },
    [update],
  );
}

export function useSwitchOrg() {
  const refreshSessionClaims = useSessionClaimsRefresh();
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationKey: ["organization", "switch"],
    mutationFn: (orgId: string) =>
      apiClient.post(
        "/organization/switch",
        { orgId },
        undefined,
        switchOrgContract,
      ),
    onMutate: () => {
      setAutoSignOutSuppressed(true);
      clearGateCookies();
    },
    onSuccess: async (data) => {
      await refreshSessionClaims({ orgId: data.orgId });
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
