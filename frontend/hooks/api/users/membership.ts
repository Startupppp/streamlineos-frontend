"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { UseQueryOptions } from "@tanstack/react-query";
import { useCan } from "@/hooks/api/access";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import type {
  LoginHistoryResponse,
  UpdateUserMembershipPayload,
  UserMembership,
} from "./types";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";

export const useUserLoginHistory = (
  userId: string,
  params?: { cursor?: string; limit?: number; success?: boolean },
  options?: Omit<UseQueryOptions<LoginHistoryResponse, Error>, "queryKey" | "queryFn">,
) => {
  const canManage = useCan("settings:organization:manage");
  return useQuery<LoginHistoryResponse, Error>({
    queryKey: usersAndCommerceQueryKeys.users.loginHistory(
      userId,
      params as Record<string, unknown> | undefined,
    ),
    queryFn: ({ signal }) =>
      apiClient.get<LoginHistoryResponse>(`/users/${userId}/login-history`, {
        ...(params?.cursor ? { cursor: params.cursor } : {}),
        ...(params?.limit ? { limit: String(params.limit) } : {}),
        ...(params?.success !== undefined ? { success: String(params.success) } : {}),
      }, signal),
    staleTime: 30_000,
    ...options,
    enabled: !!userId && canManage && (options?.enabled ?? true),
  });
};

export const useUserMembership = (
  userId: string,
  options?: Omit<UseQueryOptions<UserMembership, Error>, "queryKey" | "queryFn">,
) => {
  const canView = useCan("settings:view");
  return useQuery<UserMembership, Error>({
    queryKey: usersAndCommerceQueryKeys.users.membership(userId),
    queryFn: ({ signal }) => apiClient.get<UserMembership>(`/users/${userId}/membership`, undefined, signal),
    staleTime: 30_000,
    ...options,
    enabled: !!userId && canView && (options?.enabled ?? true),
  });
};

export const useUpdateUserMembership = () => {
  const queryClient = useQueryClient();
  return useAuthorizedMutation<
    { success: boolean },
    Error,
    { userId: string; data: UpdateUserMembershipPayload }
  >("settings:organization:manage", {
    mutationKey: ["users", "update-membership"],
    mutationFn: ({ userId, data }) =>
      apiClient.patch<{ success: boolean }>(`/users/${userId}/membership`, data),
    onSuccess: (_, { userId }) => {
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.membership(userId) });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.detail(userId) });
      void queryClient.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.users.all });
    },
  });
};
