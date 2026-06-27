"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { KbCategory, CreateCategoryInput, UpdateCategoryInput } from "@/types/kb";

export function useKbCategories(spaceId: number) {
  return useQuery({
    queryKey: queryKeys.kb.spaceCategories(spaceId),
    queryFn: () => apiClient.get<KbCategory[]>(`/kb/spaces/${spaceId}/categories`),
    enabled: Number.isFinite(spaceId) && spaceId > 0,
    staleTime: 60_000,
  });
}

export function useCreateKbCategory(spaceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) =>
      apiClient.post<KbCategory>(`/kb/spaces/${spaceId}/categories`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaceCategories(spaceId) });
    },
  });
}

export function useUpdateKbCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: UpdateCategoryInput) =>
      apiClient.patch<KbCategory>(`/kb/categories/${id}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaceCategories(variables.spaceId) });
    },
  });
}

export function useDeleteKbCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; spaceId: number }) =>
      apiClient.delete<{ success: boolean }>(`/kb/categories/${id}`),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaceCategories(variables.spaceId) });
    },
  });
}
