"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { Permission } from "@/lib/rbac/permissions";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

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
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export function useUserApiTokens(params: { cursor?: string; limit: number }) {
  return useGatedQuery("settings:api-tokens:read", {
    queryKey: queryKeys.userApiTokens.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<UserApiTokenPage>("/me/api-tokens", {
        ...(params.cursor ? { cursor: params.cursor } : {}),
        limit: String(params.limit),
      }, signal),
    staleTime: 30_000,
  });
}

export function useGrantableUserApiTokenPermissions() {
  return useGatedQuery("settings:api-tokens:read", {
    queryKey: queryKeys.userApiTokens.permissions(),
    queryFn: ({ signal }) => apiClient.get<Permission[]>("/me/api-tokens/permissions", undefined, signal),
    staleTime: 5 * 60_000,
  });
}

export function useCreateUserApiToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
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
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["revoke", "user", "api", "token"],
    mutationFn: (tokenId: string) =>
      apiClient.delete<void>(`/me/api-tokens/${tokenId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userApiTokens.all });
    },
  });
}
