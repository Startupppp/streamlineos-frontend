"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { invalidatePersonAccountAccess } from "./cache";
import type {
  InvitationsListParams,
  InvitationsResponse,
  InviteUserPayload,
} from "./types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";
import { useIdempotentOperation } from "@/hooks/common/use-idempotent-operation";

const inviteUserContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then(
    (m) => m.inviteUserContract,
  ),
);
const bulkInviteContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then(
    (m) => m.bulkInviteContract,
  ),
);
const invitationsResponseContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then(
    (m) => m.invitationsResponseContract,
  ),
);
const userSuccessContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then(
    (m) => m.userSuccessContract,
  ),
);
const invitationJoinLinkContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then(
    (m) => m.invitationJoinLinkContract,
  ),
);

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  const operation = useIdempotentOperation();
  return useAuthorizedMutation<
    { success: boolean; invitationId: string; resent: boolean },
    Error,
    InviteUserPayload
  >("settings:organization:manage", {
    mutationKey: ["users", "invite"],
    mutationFn: (invitation) =>
      apiClient.post<{
        success: boolean;
        invitationId: string;
        resent: boolean;
      }>(
        "/users/invite",
        invitation,
        operation.configFor(invitation),
        inviteUserContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: usersAndCommerceQueryKeys.users.invitations(),
      });
      void queryClient.invalidateQueries({
        queryKey: usersAndCommerceQueryKeys.users.stats(),
      });
      invalidatePersonAccountAccess(queryClient);
    },
    onSettled: operation.settle,
  });
};

export const useBulkInviteUsers = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    {
      deliveryMode: "background" | "enqueue";
      results: Array<{
        email: string;
        originalEmail: string;
        success: boolean;
        invitationId?: string;
        isDuplicate?: boolean;
        error?: string;
      }>;
    },
    Error,
    { emails: string[]; role: string }
  >("settings:organization:manage", {
    mutationKey: ["users", "bulk-invite"],
    mutationFn: (invitationBatch) =>
      apiClient.post<{
        deliveryMode: "background" | "enqueue";
        results: Array<{
          email: string;
          originalEmail: string;
          success: boolean;
          invitationId?: string;
          isDuplicate?: boolean;
          error?: string;
        }>;
      }>("/users/bulk-invite", invitationBatch, undefined, bulkInviteContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: usersAndCommerceQueryKeys.users.all,
      });
      void queryClient.invalidateQueries({
        queryKey: usersAndCommerceQueryKeys.users.invitations(),
      });
      void queryClient.invalidateQueries({
        queryKey: usersAndCommerceQueryKeys.users.stats(),
      });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};

export const useInvitations = (
  params?: InvitationsListParams,
  options?: Omit<
    UseQueryOptions<InvitationsResponse, Error>,
    "queryKey" | "queryFn"
  >,
) => {
  const canView = useCan("settings:organization:manage");
  return useQuery<InvitationsResponse, Error>({
    queryKey: usersAndCommerceQueryKeys.users.invitations(params),
    queryFn: ({ signal }) =>
      apiClient.get<InvitationsResponse>(
        "/users/invitations",
        {
          ...(params?.cursor ? { cursor: params.cursor } : {}),
          ...(params?.limit ? { limit: String(params.limit) } : {}),
          ...(params?.includeAccepted ? { includeAccepted: "true" } : {}),
          ...(params?.status ? { status: params.status } : {}),
          ...(params?.q ? { q: params.q } : {}),
        },
        signal,
        invitationsResponseContract,
      ),
    staleTime: 30_000,
    refetchOnWindowFocus: "always",
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
};

export const useResendInvite = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, string>(
    "settings:organization:manage",
    {
      mutationKey: ["resend", "invite"],
      mutationFn: (invitationId) =>
        apiClient.post<{ success: boolean }>(
          `/users/invitations/${invitationId}/resend`,
          {},
          undefined,
          userSuccessContract,
        ),
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: usersAndCommerceQueryKeys.users.invitations(),
        });
        void queryClient.invalidateQueries({
          queryKey: usersAndCommerceQueryKeys.users.stats(),
        });
        invalidatePersonAccountAccess(queryClient);
      },
    },
  );
};

export interface InvitationJoinLink {
  joinUrl: string;
  email: string;
  expiresAt: string;
}

export const useReissueInvitationJoinLink = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<InvitationJoinLink, Error, string>(
    "settings:organization:manage",
    {
      mutationKey: ["reissue", "invite-join-link"],
      mutationFn: (invitationId) =>
        apiClient.post<InvitationJoinLink>(
          `/users/invitations/${invitationId}/join-link`,
          {},
          undefined,
          invitationJoinLinkContract,
        ),
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: usersAndCommerceQueryKeys.users.invitations(),
        });
      },
    },
  );
};

export const useChangeInvitationRole = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { invitationId: string; role: string }
  >("settings:organization:manage", {
    mutationKey: ["change", "invitation-role"],
    mutationFn: ({ invitationId, role }) =>
      apiClient.patch<{ success: boolean }>(
        `/users/invitations/${invitationId}/role`,
        { role },
        undefined,
        userSuccessContract,
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: usersAndCommerceQueryKeys.users.invitations(),
      });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};

export const useCancelInvitation = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, string>(
    "settings:organization:manage",
    {
      mutationKey: ["cancel", "invitation"],
      mutationFn: (invitationId) =>
        apiClient.delete<{ success: boolean }>(
          `/users/invitations/${invitationId}`,
          undefined,
          undefined,
          userSuccessContract,
        ),
      onSuccess: () => {
        void queryClient.invalidateQueries({
          queryKey: usersAndCommerceQueryKeys.users.invitations(),
        });
        void queryClient.invalidateQueries({
          queryKey: usersAndCommerceQueryKeys.users.stats(),
        });
        invalidatePersonAccountAccess(queryClient);
      },
    },
  );
};
