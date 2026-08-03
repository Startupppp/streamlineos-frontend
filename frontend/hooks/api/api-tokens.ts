"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ApiToken {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  isRevoked: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  createdAt: string;
}

interface ApiTokenPage {
  data: ApiToken[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateApiTokenInput {
  name: string;
  description?: string;
  scopes?: string[];
  expiresAt?: string;
}

export interface CreateApiTokenResponse {
  token: string;
  apiKey: ApiToken;
}

export function useApiTokens(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.apiTokens.list(params),
    queryFn: () =>
      apiClient.get<ApiTokenPage>("/api-tokens", params as Record<string, unknown>),
    staleTime: 30_000,
  });
}

export function useCreateApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["create", "api", "token"],
    mutationFn: (input: CreateApiTokenInput) =>
      apiClient.post<CreateApiTokenResponse>("/api-tokens", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiTokens.all });
    },
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["revoke", "api", "token"],
    mutationFn: (tokenId: string) =>
      apiClient.patch<{ success: boolean }>(`/api-tokens/${tokenId}/revoke`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiTokens.all });
    },
  });
}

export function useDeleteApiToken() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["delete", "api", "token"],
    mutationFn: (tokenId: string) =>
      apiClient.delete<void>(`/api-tokens/${tokenId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.apiTokens.all });
    },
  });
}
