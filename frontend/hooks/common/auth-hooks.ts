"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Session } from "next-auth";
import type { SignInResponse } from "next-auth/react";
import { getSession, signIn, signOut, useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import {
  apiClient,
  clearBackendTokenCache,
  clearImpersonation,
  endSession,
  setAutoSignOutSuppressed,
} from "@/lib/api-client";
import { publishLogout, subscribeLogout } from "@/lib/auth-broadcast";
import { clearGateCookies } from "@/lib/onboarding-gate";
import type { SkippedGrant } from "@/hooks/common/auth-schema";
import { clearStreamToken } from "@/features/notifications/use-notification-events";
import { getErrorMessage } from "@/lib/get-error-message";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { lazyContract } from "@/lib/api-envelope";
import { INLINE_READ_ERROR } from "@/lib/query-error-policy";
import type { UserOrganization } from "@/hooks/api/organization-schema";
import { toast } from "sonner";

function discardOfflineCalendarAccess() {
  try { sessionStorage.removeItem("streamline-calendar-offline-session-identity"); }
  catch {}
  try { localStorage.removeItem("streamline-calendar-offline-identity"); }
  catch {}
  void import("@/lib/offline/calendar-offline-cache")
    .then((module) => module.clearOfflineCalendarSnapshot())
    .catch(() => undefined);
}

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
  import("@/hooks/common/auth-schema").then(
    (m) => m.invitationValidateContract,
  ),
);
const requestInvitationOtpContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then(
    (m) => m.requestInvitationOtpContract,
  ),
);
const acceptInvitationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.acceptInvitationContract),
);
const declineInvitationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.declineInvitationContract),
);
const resendVerificationContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then(
    (m) => m.resendVerificationContract,
  ),
);
const logoutContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then((m) => m.logoutContract),
);
const pendingInvitationsForMeContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then(
    (m) => m.pendingInvitationsForMeContract,
  ),
);
const claimInvitationResponseContract = lazyContract(() =>
  import("@/hooks/common/auth-schema").then(
    (m) => m.claimInvitationResponseContract,
  ),
);

export type MagicLinkSignInOutcome =
  | { status: "signed-in" }
  | { status: "failed" }
  | { status: "indeterminate" };

type SessionProbe =
  | { status: "read"; signedIn: boolean; sessionId: string | undefined }
  | { status: "unreadable" };

async function probeSession(): Promise<SessionProbe> {
  try {
    const session = await getSession();
    if (!session?.user)
      return { status: "read", signedIn: false, sessionId: undefined };
    return { status: "read", signedIn: true, sessionId: session.sessionId };
  } catch {
    return { status: "unreadable" };
  }
}

const CREDENTIALS_CALLBACK_ECHO_PATH = "/dashboard";
export const CREDENTIALS_SIGN_IN_TIMEOUT_MS = 45_000;

async function confirmSessionEstablished(): Promise<MagicLinkSignInOutcome> {
  const established = await probeSession();
  if (established.status === "unreadable" || !established.signedIn)
    return { status: "indeterminate" };
  if (typeof established.sessionId !== "string")
    return { status: "indeterminate" };
  return { status: "signed-in" };
}

async function attemptCredentialsSignIn(
  magicToken: string,
): Promise<MagicLinkSignInOutcome> {
  let result: SignInResponse | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    result = await Promise.race([
      signIn("credentials", {
        magicToken,
        redirect: false,
        callbackUrl: CREDENTIALS_CALLBACK_ECHO_PATH,
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("sign-in timed out")), CREDENTIALS_SIGN_IN_TIMEOUT_MS);
      }),
    ]);
  } catch {
    return confirmSessionEstablished();
  } finally {
    clearTimeout(timer);
  }
  if (!result?.ok || result.error) return { status: "failed" };
  return { status: "signed-in" };
}

export async function signInWithMagicToken(
  magicToken: string,
): Promise<MagicLinkSignInOutcome> {
  if (!magicToken) return { status: "failed" };
  clearBackendTokenCache();
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
  id: string;
  email: string;
  organizationName: string;
  role: string;
  userExists: boolean;
}

export function useValidateInvitation(token: string) {
  return useQuery<InvitationValidation>({
    queryKey: platformCoreQueryKeys.invitation.token(token),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/organization/invitations/validate",
        { token },
        signal,
        invitationValidateContract,
      ),
    staleTime: 60_000,
    enabled: !!token,
    retry: false,
    ...INLINE_READ_ERROR,
  });
}

export function useRequestInvitationOtp() {
  return useMutation({
    mutationKey: ["auth", "request-invitation-otp"],
    mutationFn: (variables: { token: string }) =>
      apiClient.post<{ ok: true }>(
        "/organization/invitations/request-otp",
        variables,
        undefined,
        requestInvitationOtpContract,
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
      emailOtp?: string;
    }) =>
      apiClient.post<{ ok: true; autoLoginToken: string; skippedGrants: SkippedGrant[] }>(
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

export interface SignOutOutcome {
  localSignOutCompleted: boolean;
  serverRevocationCompleted: boolean;
}

const SIGN_OUT_REVOKE_TIMEOUT_MS = 4000;

const SERVER_REVOCATION_FAILED_MESSAGE =
  "Signed out on this device. Server session could not be revoked, so other devices may still be signed in — sign out from them directly.";

export function useSignOut() {
  const router = useRouter();
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["auth", "sign-out"],
    mutationFn: async (): Promise<SignOutOutcome> => {
      setAutoSignOutSuppressed(true);
      let serverRevocationCompleted = false;
      try {
        await apiClient.post(
          "/auth/logout",
          undefined,
          { timeoutMs: SIGN_OUT_REVOKE_TIMEOUT_MS },
          logoutContract,
        );
        serverRevocationCompleted = true;
      } catch {
        serverRevocationCompleted = false;
      }
      clearImpersonation();
      discardOfflineCalendarAccess();
      clearBackendTokenCache();
      clearStreamToken();
      queryClient.clear();
      await signOut({ redirect: false });
      publishLogout();
      return { localSignOutCompleted: true, serverRevocationCompleted };
    },
    onSuccess: (outcome) => {
      clearGateCookies();
      if (!outcome.serverRevocationCompleted)
        toast.error(SERVER_REVOCATION_FAILED_MESSAGE);
      router.push("/signin");
      router.refresh();
    },
    onSettled: () => {
      window.setTimeout(() => setAutoSignOutSuppressed(false), 4000);
    },
  });
}

export function useGetOrganizations(enabled = true) {
  const { status } = useSession();
  return useQuery<UserOrganization[]>({
    queryKey: platformCoreQueryKeys.organization.all,
    queryFn: ({ signal }) =>
      apiClient.get("/organization", undefined, signal, organizationsContract),
    staleTime: 5 * 60_000,
    enabled: status === "authenticated" && enabled,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
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

const CLAIM_REFRESH_TIMEOUT_MS = 18_000;

export type SessionClaimsRefresh = (data?: unknown) => Promise<Session | null>;

export function useSessionClaimsRefresh(): SessionClaimsRefresh {
  const { update } = useSession();
  return useCallback(
    (data?: unknown) => {
      clearBackendTokenCache();
      return new Promise<Session | null>((resolve) => {
        const timeout = setTimeout(
          () => resolve(null),
          CLAIM_REFRESH_TIMEOUT_MS,
        );
        void update(data).then(
          (session) => {
            clearTimeout(timeout);
            resolve(session);
          },
          () => {
            clearTimeout(timeout);
            resolve(null);
          },
        );
      });
    },
    [update],
  );
}

const SWITCH_UNCONFIRMED_MESSAGE =
  "Workspace switch could not be confirmed. You are still in your previous workspace — please try again.";

const AUTO_SIGN_OUT_SUPPRESSION_MS = 4000;

const AUTH_ONLY_SEGMENTS = new Set([
  "signin",
  "signup",
  "verify",
  "org-setup",
  "employee-onboarding",
]);

function sectionRootFromPathname(pathname: string): string {
  const first = pathname.split("/")[1];
  if (!first || AUTH_ONLY_SEGMENTS.has(first)) return "/dashboard";
  return `/${first}`;
}

export function useMyPendingInvitations(enabled = true) {
  const { status } = useSession();
  return useQuery({
    queryKey: ["auth", "pending-invitations-for-me"],
    queryFn: ({ signal }) =>
      apiClient.get(
        "/organization/invitations/pending-for-me",
        undefined,
        signal,
        pendingInvitationsForMeContract,
      ),
    staleTime: 60_000,
    enabled: status === "authenticated" && enabled,
    ...INLINE_READ_ERROR,
  });
}

export function useClaimInvitation() {
  return useMutation({
    mutationKey: ["auth", "claim-invitation"],
    mutationFn: (invitationId: string) =>
      apiClient.post(
        `/organization/invitations/${invitationId}/claim`,
        {},
        undefined,
        claimInvitationResponseContract,
      ),
  });
}

export function useLogoutBroadcastListener(): void {
  useEffect(() => subscribeLogout(endSession), []);
}

export function useSwitchOrg() {
  const refreshSessionClaims = useSessionClaimsRefresh();
  const queryClient = useQueryClient();
  const router = useRouter();
  const pathname = usePathname();
  const switchGenerationRef = useRef(0);
  return useMutation({
    mutationKey: ["organization", "switch"],
    mutationFn: (orgId: string) =>
      apiClient.post(
        "/organization/switch",
        { orgId },
        undefined,
        switchOrgContract,
      ),
    onMutate: async () => {
      switchGenerationRef.current += 1;
      const generation = switchGenerationRef.current;
      const sectionRoot = sectionRootFromPathname(pathname);
      setAutoSignOutSuppressed(true);
      clearImpersonation();
      clearStreamToken();
      clearGateCookies();
      await queryClient.cancelQueries();
      return { generation, sectionRoot };
    },
    onSuccess: async (data, _orgId, onMutateResult) => {
      const refreshed = await refreshSessionClaims({ orgId: data.orgId });
      if (onMutateResult.generation !== switchGenerationRef.current) return;
      if (!refreshed || refreshed.orgId !== data.orgId) {
        toast.error(SWITCH_UNCONFIRMED_MESSAGE);
        return;
      }
      discardOfflineCalendarAccess();
      queryClient.clear();
      router.replace(onMutateResult.sectionRoot);
      router.refresh();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
    onSettled: (_data, _error, _orgId, onMutateResult) => {
      const generation = onMutateResult?.generation;
      window.setTimeout(() => {
        if (generation !== switchGenerationRef.current) return;
        setAutoSignOutSuppressed(false);
      }, AUTO_SIGN_OUT_SUPPRESSION_MS);
    },
  });
}
