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

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, { userId: string; data: UpdateUserInput }>({
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
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; status: "active" | "suspended" | "archived"; reason?: string }
  >({
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
  return useMutation<{ success: boolean }, Error, string>({
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
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; sessionId: string }
  >({
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
  return useMutation<{ success: boolean }, Error, string>({
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
  return useMutation<
    UserPreferences,
    Error,
    { userId: string; data: UpdateUserPreferencesInput }
  >({
    mutationKey: ["users", "update-preferences"],
    mutationFn: ({ userId, data }) =>
      apiClient.patch<UserPreferences>(`/users/${userId}/preferences`, data),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.preferences(userId) });
    },
  });
};
