"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface FeatureFlag {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: "global" | "percentage" | "org" | "user";
  enabled: boolean;
  rolloutPercentage: number;
  orgOverrides: Array<{ orgId: string; enabled: boolean }>;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFlagInput {
  key: string;
  name: string;
  description?: string;
  type: FeatureFlag["type"];
  enabled?: boolean;
  rolloutPercentage?: number;
}

interface UpdateFlagInput {
  name?: string;
  description?: string;
  enabled?: boolean;
  rolloutPercentage?: number;
}

export function useFeatureFlags() {
  return useQuery({
    queryKey: queryKeys.featureFlags.list(),
    queryFn: () => apiClient.get<FeatureFlag[]>("/feature-flags"),
    staleTime: 60_000,
  });
}

export function useCreateFlag() {
  const qc = useQueryClient();
  return useMutation<FeatureFlag, Error, CreateFlagInput>({
    mutationFn: (data) => apiClient.post<FeatureFlag>("/feature-flags", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.featureFlags.all });
    },
  });
}

export function useUpdateFlag() {
  const qc = useQueryClient();
  return useMutation<FeatureFlag, Error, { key: string } & UpdateFlagInput>({
    mutationFn: ({ key, ...data }) =>
      apiClient.patch<FeatureFlag>(`/feature-flags/${key}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.featureFlags.list() });
      qc.invalidateQueries({ queryKey: queryKeys.featureFlags.detail(vars.key) });
    },
  });
}

export function useArchiveFlag() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: (key) => apiClient.delete<void>(`/feature-flags/${key}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.featureFlags.all });
    },
  });
}

