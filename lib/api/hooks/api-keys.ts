"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface ApiKey {
  id: string;
  name: string;
  description: string | null;
  keyPrefix: string;
  isRevoked: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  createdBy: string;
}

export interface CreateApiKeyInput {
  name: string;
  description?: string;
  expiresAt?: string;
}

export interface CreateApiKeyResponse {
  key: string;
  prefix: string;
}

export const useApiKeys = () =>
  useQuery<ApiKey[]>({
    queryKey: queryKeys.apiKeys.list(),
    queryFn: () => apiClient.get<ApiKey[]>("/settings/api-keys"),
  });

export const useCreateApiKey = () => {
  const qc = useQueryClient();
  return useMutation<CreateApiKeyResponse, Error, CreateApiKeyInput>({
    mutationFn: (input) => apiClient.post<CreateApiKeyResponse>("/settings/api-keys", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.apiKeys.all }),
  });
};

export const useRevokeApiKey = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (keyId: string) => apiClient.delete(`/settings/api-keys/${keyId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.apiKeys.all }),
  });
};
