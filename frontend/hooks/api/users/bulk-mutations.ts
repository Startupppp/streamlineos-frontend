"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { invalidatePersonAccountAccess } from "./cache";
import type { BulkActionResult, BulkUpdatePayload } from "./types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const bulkActionResultContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.bulkActionResultContract),
);
const bulkUpdateContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.bulkUpdateContract),
);
const sendSigninLinkContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.sendSigninLinkContract),
);
const updateUserRoleContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.updateUserRoleContract),
);

export function useBulkSuspend() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BulkActionResult, Error, { userIds: string[]; reason?: string }>("settings:organization:manage", {
    mutationKey: ["bulk", "suspend"],
    mutationFn: (payload) => apiClient.post<BulkActionResult>("/users/bulk-suspend", payload, undefined, bulkActionResultContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.members() });
    },
  });
}

export function useBulkArchive() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BulkActionResult, Error, { userIds: string[]; reason?: string }>("settings:organization:manage", {
    mutationKey: ["bulk", "archive"],
    mutationFn: (payload) => apiClient.post<BulkActionResult>("/users/bulk-archive", payload, undefined, bulkActionResultContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.members() });
    },
  });
}

export function useBulkRestore() {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BulkActionResult, Error, { userIds: string[]; reason?: string }>("settings:organization:manage", {
    mutationKey: ["bulk", "restore"],
    mutationFn: (payload) => apiClient.post<BulkActionResult>("/users/bulk-restore", payload, undefined, bulkActionResultContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.members() });
    },
  });
}

export const useBulkUpdateUsers = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean; updated: number }, Error, BulkUpdatePayload>("settings:organization:manage", {
    mutationKey: ["bulk", "update", "users"],
    mutationFn: (payload) =>
      apiClient.post<{ success: boolean; updated: number }>("/users/bulk-update", payload, undefined, bulkUpdateContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
    },
  });
};

export const useSendSigninLink = () => {
  return useAuthorizedMutation<{ success: boolean; email: string }, Error, string>("settings:organization:manage", {
    mutationKey: ["send", "signin", "link"],
    mutationFn: (userId) =>
      apiClient.post<{ success: boolean; email: string }>(
        `/users/${userId}/send-signin-link`,
        {},
        undefined,
        sendSigninLinkContract,
      ),
  });
};

export const useUpdateUserRole = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean; userId: string; role: string },
    Error,
    { userId: string; role: string }
  >("settings:rbac:manage", {
    mutationKey: ["users", "update-role"],
    mutationFn: ({ userId, role }) =>
      apiClient.post<{ success: boolean; userId: string; role: string }>(
        `/settings/users/${userId}/role`,
        { role },
        undefined,
        updateUserRoleContract,
      ),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.members() });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};
