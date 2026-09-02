"use client";

import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { invalidatePersonAccountAccess } from "./cache";
import type { BulkActionResult, BulkUpdatePayload } from "./types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

function useBulkLifecycleMutation(endpoint: string, mutationKey: string) {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<BulkActionResult, Error, { userIds: string[]; reason?: string }>("settings:organization:manage", {
    mutationKey: ["bulk", mutationKey],
    mutationFn: (payload) => apiClient.post<BulkActionResult>(endpoint, payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.members() });
    },
  });
}

export const useBulkSuspend = () =>
  useBulkLifecycleMutation("/users/bulk-suspend", "suspend");

export const useBulkArchive = () =>
  useBulkLifecycleMutation("/users/bulk-archive", "archive");

export const useBulkRestore = () =>
  useBulkLifecycleMutation("/users/bulk-restore", "restore");

export const useBulkUpdateUsers = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean; updated: number }, Error, BulkUpdatePayload>("settings:organization:manage", {
    mutationKey: ["bulk", "update", "users"],
    mutationFn: (payload) =>
      apiClient.post<{ success: boolean; updated: number }>("/users/bulk-update", payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
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
      ),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.members() });
      invalidatePersonAccountAccess(queryClient);
    },
  });
};
