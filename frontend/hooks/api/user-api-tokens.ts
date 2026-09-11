"use client";

import {
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { usersAndCommerceQueryKeys } from "@/lib/query-keys/users-and-commerce";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";
import { permissionCatalogContract } from "@/hooks/api/access-schema";
import {
  createUserApiTokenResponseContract,
  userApiTokenPageContract,
} from "@/hooks/api/user-api-tokens-schema";
import { noContentContract } from "@/hooks/api/cursor-page-schema";
import type { CreateUserApiTokenInput } from "@/hooks/api/user-api-tokens-schema";

export type {
  CreateUserApiTokenInput,
  CreateUserApiTokenResponse,
  UserApiToken,
  UserApiTokenPage,
} from "@/hooks/api/user-api-tokens-schema";

export function useUserApiTokens(params: { cursor?: string; limit: number }) {
  return useGatedQuery("settings:api-tokens:read", {
    queryKey: usersAndCommerceQueryKeys.userApiTokens.list(params),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/me/api-tokens",
        {
          ...(params.cursor ? { cursor: params.cursor } : {}),
          limit: String(params.limit),
        },
        signal,
        userApiTokenPageContract,
      ),
    staleTime: 30_000,
  });
}

export function useGrantableUserApiTokenPermissions() {
  return useGatedQuery("settings:api-tokens:read", {
    queryKey: usersAndCommerceQueryKeys.userApiTokens.permissions(),
    queryFn: ({ signal }) =>
      apiClient.get(
        "/me/api-tokens/permissions",
        undefined,
        signal,
        permissionCatalogContract,
      ),
    staleTime: 5 * 60_000,
  });
}

export function useCreateUserApiToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["create", "user", "api", "token"],
    mutationFn: (input: CreateUserApiTokenInput) =>
      apiClient.post(
        "/me/api-tokens",
        input,
        undefined,
        createUserApiTokenResponseContract,
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.userApiTokens.all });
    },
  });
}

export function useRevokeUserApiToken() {
  const qc = useQueryClient();
  return useAuthorizedMutation("settings:api-tokens:write", {
    mutationKey: ["revoke", "user", "api", "token"],
    mutationFn: (tokenId: string) =>
      apiClient.delete<void>(`/me/api-tokens/${tokenId}`, undefined, undefined, noContentContract),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: usersAndCommerceQueryKeys.userApiTokens.all });
    },
  });
}
