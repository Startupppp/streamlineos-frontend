"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { invalidatePersonAccountAccess } from "./cache";
import type {
  InvitationsResponse,
  InviteUserPayload,
} from "./types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean; invitationId: string; resent: boolean },
    Error,
    InviteUserPayload
  >("settings:organization:manage", {
    mutationKey: ["users", "invite"],
    mutationFn: (invitation) =>
      apiClient.post<{ success: boolean; invitationId: string; resent: boolean }>(
        "/users/invite",
        invitation,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.invitations() });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};

export const useBulkInviteUsers = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { results: Array<{ email: string; success: boolean; invitationId?: string; error?: string }> },
    Error,
    { emails: string[]; role: string }
  >("settings:organization:manage", {
    mutationKey: ["users", "bulk-invite"],
    mutationFn: (invitationBatch) =>
      apiClient.post<{
        results: Array<{
          email: string;
          success: boolean;
          invitationId?: string;
          error?: string;
        }>;
      }>("/users/bulk-invite", invitationBatch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.invitations() });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};

export const useInvitations = (
  params?: {
    page?: number;
    limit?: number;
    includeAccepted?: boolean;
    status?: "pending" | "accepted" | "expired" | "revoked";
    q?: string;
  },
  options?: Omit<UseQueryOptions<InvitationsResponse, Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("settings:organization:manage");
  return useQuery<InvitationsResponse, Error>({
    queryKey: usersAndCommerceQueryKeys.users.invitations(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<InvitationsResponse>("/users/invitations", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.includeAccepted ? { includeAccepted: "true" } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.q ? { q: params.q } : {}),
      }, signal),
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
};

export const useResendInvite = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, string>("settings:organization:manage", {
    mutationKey: ["resend", "invite"],
    mutationFn: (invitationId) =>
      apiClient.post<{ success: boolean }>(`/users/invitations/${invitationId}/resend`, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.invitations() });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};

export const useChangeInvitationRole = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, { invitationId: string; role: string }>("settings:organization:manage", {
    mutationKey: ["change", "invitation-role"],
    mutationFn: ({ invitationId, role }) =>
      apiClient.patch<{ success: boolean }>(
        `/users/invitations/${invitationId}/role`,
        { role },
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.invitations() });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};

export const useCancelInvitation = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, string>("settings:organization:manage", {
    mutationKey: ["cancel", "invitation"],
    mutationFn: (invitationId) =>
      apiClient.delete<{ success: boolean }>(`/users/invitations/${invitationId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.invitations() });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};
