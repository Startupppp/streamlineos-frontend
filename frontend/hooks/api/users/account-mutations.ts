"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { platformCoreQueryKeys } from "@/lib/query-keys/platform-core";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { invalidateCalendarMemberLookups } from "./cache";
import type {
  UpdateUserInput,
  UpdateUserPreferencesInput,
  User,
  UserPreferences,
} from "./types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { lazyContract } from "@/lib/api-envelope";

const userDetailResponseContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.userDetailResponseContract),
);
const userSuccessContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.userSuccessContract),
);
const userPreferencesContract = lazyContract(() =>
  import("@/hooks/api/users/extended-users-schema").then((m) => m.userPreferencesContract),
);

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<User, Error, { userId: string; data: UpdateUserInput }>("settings:organization:manage", {
    mutationKey: ["update", "user"],
    mutationFn: ({ userId, data }) => apiClient.patch<User>(`/users/${userId}`, data, undefined, userDetailResponseContract),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
    },
  });
};

export const useUpdateUserStatus = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { userId: string; status: "active" | "suspended" | "archived"; reason?: string }
  >("settings:organization:manage", {
    mutationKey: ["users", "update-status"],
    mutationFn: ({ userId, status, reason }) =>
      apiClient.patch<{ success: boolean }>(`/users/${userId}/status`, { status, reason }, undefined, userSuccessContract),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.members() });
      invalidateCalendarMemberLookups(queryClient);
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, string>("settings:organization:manage", {
    mutationKey: ["delete", "user"],
    mutationFn: (userId) => apiClient.delete<{ success: boolean }>(`/users/${userId}`, undefined, undefined, userSuccessContract),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: platformCoreQueryKeys.organization.members() });
      invalidateCalendarMemberLookups(queryClient);
    },
  });
};

export const useRevokeSession = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { userId: string; sessionId: string }
  >("settings:organization:manage", {
    mutationKey: ["users", "revoke-session"],
    mutationFn: ({ userId, sessionId }) =>
      apiClient.delete<{ success: boolean }>(`/users/${userId}/sessions/${sessionId}`, undefined, undefined, userSuccessContract),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.sessions(userId) });
    },
  });
};

export const useRevokeAllSessions = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, string>("settings:organization:manage", {
    mutationKey: ["revoke", "all", "sessions"],
    mutationFn: (userId) =>
      apiClient.delete<{ success: boolean }>(`/users/${userId}/sessions`, undefined, undefined, userSuccessContract),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.sessions(userId) });
    },
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    UserPreferences,
    Error,
    { userId: string; data: UpdateUserPreferencesInput }
  >("settings:organization:manage", {
    mutationKey: ["users", "update-preferences"],
    mutationFn: ({ userId, data }) =>
      apiClient.patch<UserPreferences>(`/users/${userId}/preferences`, data, undefined, userPreferencesContract),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.preferences(userId) });
    },
  });
};
