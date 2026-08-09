"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Permission } from "@/lib/rbac/permissions";

export interface UserApiToken {
  id: string;
  userId: string;
  name: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
}

export interface CreateUserApiTokenInput {
  name: string;
  scopes: string[];
  expiresAt: string;
}

export interface CreateUserApiTokenResponse extends UserApiToken {
  rawToken: string;
}

export interface UserApiTokenPage {
  data: UserApiToken[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function useUserApiTokens(params: { page: number; limit: number }) {
  return useQuery({
    queryKey: queryKeys.userApiTokens.list(params),
    queryFn: () =>
      apiClient.get<UserApiTokenPage>("/me/api-tokens", {
        page: String(params.page),
        limit: String(params.limit),
      }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useGrantableUserApiTokenPermissions() {
  return useQuery({
    queryKey: queryKeys.userApiTokens.permissions(),
    queryFn: () => apiClient.get<Permission[]>("/me/api-tokens/permissions"),
    staleTime: 5 * 60_000,
  });
}

export function useCreateUserApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "user", "api", "token"],
    mutationFn: (input: CreateUserApiTokenInput) =>
      apiClient.post<CreateUserApiTokenResponse>("/me/api-tokens", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userApiTokens.all });
    },
  });
}

export function useRevokeUserApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["revoke", "user", "api", "token"],
    mutationFn: (tokenId: string) =>
      apiClient.delete<void>(`/me/api-tokens/${tokenId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userApiTokens.all });
    },
  });
}
