"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type {
  UpdateUserInput,
  UpdateUserPreferencesInput,
  User,
  UserPreferences,
} from "./types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<User, Error, { userId: string; data: UpdateUserInput }>("settings:organization:manage", {
    mutationKey: ["update", "user"],
    mutationFn: ({ userId, data }) => apiClient.patch<User>(`/users/${userId}`, data),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
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
      apiClient.patch<{ success: boolean }>(`/users/${userId}/status`, { status, reason }),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.members() });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, string>("settings:organization:manage", {
    mutationKey: ["delete", "user"],
    mutationFn: (userId) => apiClient.delete<{ success: boolean }>(`/users/${userId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.organization.members() });
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
      apiClient.delete<{ success: boolean }>(`/users/${userId}/sessions/${sessionId}`),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions(userId) });
    },
  });
};

export const useRevokeAllSessions = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<{ success: boolean }, Error, string>("settings:organization:manage", {
    mutationKey: ["revoke", "all", "sessions"],
    mutationFn: (userId) =>
      apiClient.delete<{ success: boolean }>(`/users/${userId}/sessions`),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions(userId) });
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
      apiClient.patch<UserPreferences>(`/users/${userId}/preferences`, data),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.preferences(userId) });
    },
  });
};
