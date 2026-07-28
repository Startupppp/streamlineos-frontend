"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

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
  scopes?: string[];
  expiresAt?: string;
}

export interface CreateUserApiTokenResponse extends UserApiToken {
  rawToken: string;
}

export function useUserApiTokens() {
  return useQuery({
    queryKey: queryKeys.userApiTokens.list(),
    queryFn: () => apiClient.get<UserApiToken[]>("/me/api-tokens"),
    staleTime: 30_000,
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
