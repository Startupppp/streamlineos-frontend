"use client";

import { useQuery } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { userStatsContract } from "@/hooks/api/users/users-schema";
import type {
  User,
  UserListParams,
  UserPreferences,
  UserSession,
  UsersResponse,
  UserStats,
} from "./types";

export const useUsers = (
  params?: UserListParams,
  options?: Omit<UseQueryOptions<UsersResponse, Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("settings:view");
  return useQuery<UsersResponse, Error>({
    queryKey: usersAndCommerceQueryKeys.users.list(params as Record<string, unknown> | undefined),
    queryFn: ({ signal }) =>
      apiClient.get<UsersResponse>("/v2/users", {
        ...(params?.cursor ? { cursor: params.cursor } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.search ? { search: params.search } : {}),
        ...(params?.status ? { status: params.status } : {}),
        ...(params?.role ? { role: params.role } : {}),
        ...(params?.departmentId ? { departmentId: String(params.departmentId) } : {}),
        ...(params?.branchId ? { branchId: String(params.branchId) } : {}),
        ...(params?.teamId ? { teamId: params.teamId } : {}),
        ...(params?.managerUserId ? { managerUserId: params.managerUserId } : {}),
        ...(params?.sortBy ? { sortBy: params.sortBy } : {}),
        ...(params?.sortOrder ? { sortOrder: params.sortOrder } : {}),
      }, signal),
    staleTime: 30_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
};

export const useUser = (
  userId: string,
  options?: Omit<UseQueryOptions<User, Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("settings:view");
  return useQuery<User, Error>({
    queryKey: usersAndCommerceQueryKeys.users.detail(userId),
    queryFn: ({ signal }) => apiClient.get<User>(`/v2/users/${userId}`, undefined, signal),
    staleTime: 30_000,
    ...options,
    enabled: !!userId && canView && (options?.enabled ?? true),
  });
};

export const useUserSessions = (
  userId: string,
  options?: Omit<UseQueryOptions<UserSession[], Error>, "queryKey" | "queryFn">,
) => {
  const canManage = useCan("settings:organization:manage");
  return useQuery<UserSession[], Error>({
    queryKey: usersAndCommerceQueryKeys.users.sessions(userId),
    queryFn: ({ signal }) => apiClient.get<UserSession[]>(`/users/${userId}/sessions`, undefined, signal),
    staleTime: 30_000,
    ...options,
    enabled: !!userId && canManage && (options?.enabled ?? true),
  });
};

export const useUserPreferences = (
  userId: string,
  options?: Omit<UseQueryOptions<UserPreferences, Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("settings:view");
  return useQuery<UserPreferences, Error>({
    queryKey: usersAndCommerceQueryKeys.users.preferences(userId),
    queryFn: ({ signal }) => apiClient.get<UserPreferences>(`/users/${userId}/preferences`, undefined, signal),
    staleTime: 30_000,
    ...options,
    enabled: !!userId && canView && (options?.enabled ?? true),
  });
};

export const useUserStats = (
  options?: Omit<UseQueryOptions<UserStats, Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("settings:view");
  return useQuery<UserStats, Error>({
    queryKey: usersAndCommerceQueryKeys.users.stats(),
    queryFn: ({ signal }) => apiClient.get("/users/stats", undefined, signal, userStatsContract),
    staleTime: 60_000,
    ...options,
    enabled: canView && (options?.enabled ?? true),
  });
};
