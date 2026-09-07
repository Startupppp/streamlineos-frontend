"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { lazyContract } from "@/lib/api-envelope";

const apiTokensPageContract = lazyContract(() =>
  import("@/hooks/api/api-tokens-schema").then((m) => m.apiTokensPageContract),
);
const createApiTokenContract = lazyContract(() =>
  import("@/hooks/api/api-tokens-schema").then((m) => m.createApiTokenContract),
);
const revokeApiTokenContract = lazyContract(() =>
  import("@/hooks/api/api-tokens-schema").then((m) => m.revokeApiTokenContract),
);

export interface ApiToken {
  id: number;
  name: string;
  description: string | null;
  keyPrefix: string;
  scopes: string[];
  isRevoked: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface ApiTokenPage {
  data: ApiToken[];
  pagination: {
    limit: number;
    nextCursor: string | null;
    hasMore: boolean;
  };
}

export interface CreateApiTokenInput {
  name: string;
  description?: string;
  expiresAt: string;
}

export interface CreateApiTokenResponse {
  token: string;
  apiKey: ApiToken;
}

export function useApiTokens(params?: { page?: number; limit?: number }) {
  return useGatedQuery("crm:settings:manage", {
    queryKey: usersAndCommerceQueryKeys.apiTokens.list(params),
    queryFn: ({ signal }) =>
      apiClient.get<ApiTokenPage>("/api-tokens", params as Record<string, unknown>, signal, apiTokensPageContract),
    staleTime: 30_000,
  });
}

export function useCreateApiToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["create", "api", "token"],
    mutationFn: (input: CreateApiTokenInput) =>
      apiClient.post<CreateApiTokenResponse>("/api-tokens", input, undefined, createApiTokenContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.apiTokens.all });
    },
  });
}

export function useRevokeApiToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("crm:settings:manage", {
    mutationKey: ["revoke", "api", "token"],
    mutationFn: (tokenId: number) =>
      apiClient.patch<{ success: boolean }>(`/api-tokens/${tokenId}/revoke`, undefined, undefined, revokeApiTokenContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.apiTokens.all });
    },
  });
}
