"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export type SavedViewVisibility = "personal" | "team" | "global";

export interface SupportSavedView {
  id: number;
  orgId: string;
  ownerId: string | null;
  name: string;
  filter: Record<string, unknown>;
  visibility: SavedViewVisibility;
  sortOrder: number;
  createdAt: string | null;
  updatedAt: string | null;
}

interface CreateSavedViewInput {
  name: string;
  filter?: Record<string, unknown>;
  visibility?: SavedViewVisibility;
  sortOrder?: number;
}

interface UpdateSavedViewInput {
  name?: string;
  filter?: Record<string, unknown>;
  visibility?: SavedViewVisibility;
  sortOrder?: number;
}

export function useSupportSavedViews() {
  return useQuery({
    queryKey: queryKeys.supportViews.list(),
    queryFn: () => apiClient.get<SupportSavedView[]>("/support/views"),
    staleTime: 60_000,
  });
}

export function useCreateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSavedViewInput) => apiClient.post<SupportSavedView>("/support/views", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportViews.all }),
  });
}

export function useUpdateSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: UpdateSavedViewInput & { id: number }) =>
      apiClient.patch<SupportSavedView>(`/support/views/${id}`, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportViews.all }),
  });
}

export function useDeleteSavedView() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => apiClient.delete<{ success: boolean }>(`/support/views/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportViews.all }),
  });
}
