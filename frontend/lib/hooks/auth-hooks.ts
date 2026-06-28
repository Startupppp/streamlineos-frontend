"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { signIn, signOut, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { apiClient, clearBackendTokenCache } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export function useVerifyEmail() {
  return useMutation({
    mutationFn: (variables: { token: string }) =>
      apiClient.post<{ success: boolean }>("/auth/verify-email", variables),
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: (variables: { email: string }) =>
      apiClient.post<{ success: boolean }>("/auth/forgot-password", variables),
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: (variables: { token: string; password: string }) =>
      apiClient.post<{ success: boolean }>("/auth/reset-password", {
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
      apiClient.post<{ success: boolean }>(
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

export function useSignIn() {
  return useMutation({
    mutationFn: async (credentials: {
      email: string;
      password: string;
      callbackUrl?: string;
    }) => {
      const result = await signIn("credentials", {
        email: credentials.email,
        password: credentials.password,
        redirect: false,
      });
      if (result?.error) throw new Error(result.error);
      return { result, callbackUrl: credentials.callbackUrl };
    },
    onSuccess: ({ callbackUrl }) => {
      const url =
        callbackUrl?.startsWith("/") && !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/dashboard";
      window.location.href = url;
    },
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

export function useSignOutAll() {
  const router = useRouter();
  return useMutation({
    mutationFn: async () => {
      try {
        await apiClient.post("/auth/logout-all", undefined);
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
  return useQuery<OrgSummary[]>({
    queryKey: queryKeys.organization.all,
    queryFn: () => apiClient.get<OrgSummary[]>("/organization"),
    staleTime: 60_000,
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

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { name: string; slug: string }) =>
      apiClient.post<{ id: string; name: string; slug: string }>(
        "/organization",
        variables,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.organization.all });
    },
  });
}

export function useInviteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { email: string; role: string }) =>
      apiClient.post<{ success: boolean; invitationId: string }>(
        "/organization/members",
        variables,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.invitations(),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(),
      });
    },
  });
}

export function useGetInvitations() {
  return useQuery({
    queryKey: queryKeys.organization.invitations(),
    queryFn: () => apiClient.get("/organization/invitations"),
  });
}

export function useCancelInvitation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { invitationId: string }) =>
      apiClient.delete("/organization/invitations", variables),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.invitations(),
      });
    },
  });
}

export function useUpdateMemberRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { userId: string; role: string }) =>
      apiClient.patch(`/organization/members/${variables.userId}`, {
        role: variables.role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(),
      });
    },
  });
}

export function useRemoveMember() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: { userId: string }) =>
      apiClient.delete(`/organization/members/${variables.userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.organization.members(),
      });
    },
  });
}
