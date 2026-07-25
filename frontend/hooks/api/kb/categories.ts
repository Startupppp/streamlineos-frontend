"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { KbCategory, CreateCategoryInput } from "@/types/kb";

export function useKbCategories(spaceId: number) {
  const canViewSpaces = useCan("kb:spaces:view");
  return useQuery({
    queryKey: queryKeys.kb.spaceCategories(spaceId),
    queryFn: () => apiClient.get<KbCategory[]>(`/kb/spaces/${spaceId}/categories`),
    enabled: canViewSpaces && Number.isFinite(spaceId) && spaceId > 0,
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
