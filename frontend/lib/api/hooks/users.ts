"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

interface UserListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "suspended" | "archived";
  role?: string;
  departmentId?: number;
}

interface UserSession {
  id: string;
  userId: string;
  userAgent: string | null;
  ipAddress: string | null;
  isRevoked: boolean;
  lastActive: string;
  deviceId: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface UserDevice {
  id: string;
  userId: string;
  fingerprint: string;
  browser: string | null;
  os: string | null;
  platform: string | null;
  trusted: boolean;
  lastSeenAt: string;
  createdAt: string;
}

interface UserActivityItem {
  id: string;
  orgId: string;
  userId: string;
  actorUserId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

interface UserPreferences {
  userId: string;
  theme: string;
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  notificationPreferences: Record<string, boolean>;
  dashboardPreferences: Record<string, unknown>;
  updatedAt: string;
}

interface User {
  id: string;
  name: string | null;
  email: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  role: string;
  designation: string | null;
  phone: string | null;
  departmentId: number | null;
  isActive: boolean;
  hasDashboardAccess: boolean;
  reportingTo: string | null;
  team: string | null;
  branchId: number | null;
  bio: string | null;
  linkedinUrl: string | null;
  twitterUrl: string | null;
  githubUrl: string | null;
  websiteUrl: string | null;
  joinedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface UsersResponse {
  data: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface UserStats {
  total: number;
  active: number;
  suspended: number;
  archived: number;
  invitedPending: number;
}

export const useUsers = (
  params?: UserListParams,
  options?: Omit<UseQueryOptions<UsersResponse, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UsersResponse, Error>({
    queryKey: queryKeys.users.list(params as Record<string, unknown> | undefined),
    queryFn: () =>
      apiClient.get<UsersResponse>("/users", {
        ...(params?.page ? { page: String(params.page) } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.role ? { role: params.role } : {}),
        ...(params?.departmentId ? { departmentId: String(params.departmentId) } : {}),
      }),
    staleTime: 30_000,
    ...options,
  });
};

export const useUser = (
  userId: string,
  options?: Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<User, Error>({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => apiClient.get<User>(`/users/${userId}`),
    enabled: !!userId,
    ...options,
  });
};

export const useUserSessions = (
  userId: string,
  options?: Omit<UseQueryOptions<UserSession[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserSession[], Error>({
    queryKey: queryKeys.users.sessions(userId),
    queryFn: () => apiClient.get<UserSession[]>(`/users/${userId}/sessions`),
    enabled: !!userId,
    ...options,
  });
};

export const useUserDevices = (
  userId: string,
  options?: Omit<UseQueryOptions<UserDevice[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserDevice[], Error>({
    queryKey: queryKeys.users.devices(userId),
    queryFn: () => apiClient.get<UserDevice[]>(`/users/${userId}/devices`),
    enabled: !!userId,
    ...options,
  });
};

export const useUserActivity = (
  userId: string,
  options?: Omit<UseQueryOptions<UserActivityItem[], Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserActivityItem[], Error>({
    queryKey: queryKeys.users.activity(userId),
    queryFn: () => apiClient.get<UserActivityItem[]>(`/users/${userId}/activity`),
    enabled: !!userId,
    ...options,
  });
};

export const useUserPreferences = (
  userId: string,
  options?: Omit<UseQueryOptions<UserPreferences, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserPreferences, Error>({
    queryKey: queryKeys.users.preferences(userId),
    queryFn: () => apiClient.get<UserPreferences>(`/users/${userId}/preferences`),
    enabled: !!userId,
    ...options,
  });
};

export const useUserStats = (
  options?: Omit<UseQueryOptions<UserStats, Error>, "queryKey" | "queryFn">
) => {
  return useQuery<UserStats, Error>({
    queryKey: queryKeys.users.stats(),
    queryFn: () => apiClient.get<UserStats>("/users/stats"),
    staleTime: 60_000,
    ...options,
  });
};

export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation<User, Error, { userId: string; data: Partial<User> }>({
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
    mutationFn: ({ userId, status, reason }) =>
      apiClient.patch<{ success: boolean }>(`/users/${userId}/status`, { status, reason }),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
    },
  });
};

export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<{ success: boolean }, Error, string>({
    mutationFn: (userId) => apiClient.delete<{ success: boolean }>(`/users/${userId}`),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.stats() });
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
    mutationFn: (userId) =>
      apiClient.delete<{ success: boolean }>(`/users/${userId}/sessions`),
    onSuccess: (_, userId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.sessions(userId) });
    },
  });
};

export const useRemoveDevice = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean },
    Error,
    { userId: string; deviceId: string }
  >({
    mutationFn: ({ userId, deviceId }) =>
      apiClient.delete<{ success: boolean }>(`/users/${userId}/devices/${deviceId}`),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.devices(userId) });
    },
  });
};

export const useUpdateUserPreferences = () => {
  const queryClient = useQueryClient();
  return useMutation<
    UserPreferences,
    Error,
    { userId: string; data: Partial<UserPreferences> }
  >({
    mutationFn: ({ userId, data }) =>
      apiClient.patch<UserPreferences>(`/users/${userId}/preferences`, data),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.preferences(userId) });
    },
  });
};

export const useInviteUser = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; invitationId: string },
    Error,
    { email: string; role: string }
  >({
    mutationFn: (data) =>
      apiClient.post<{ success: boolean; invitationId: string }>("/users/invite", data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export const useBulkInviteUsers = () => {
  const queryClient = useQueryClient();
  return useMutation<
    { success: boolean; invited: number; failed: string[] },
    Error,
    { emails: string[]; role: string }
  >({
    mutationFn: (data) =>
      apiClient.post<{ success: boolean; invited: number; failed: string[] }>(
        "/users/bulk-invite",
        data
      ),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
};

export type { User, UserSession, UserDevice, UserActivityItem, UserPreferences, UserStats };
