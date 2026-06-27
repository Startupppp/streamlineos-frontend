"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { KbSpace, CreateSpaceInput, UpdateSpaceInput } from "@/types/kb";

export function useKbSpaces() {
  return useQuery({
    queryKey: queryKeys.kb.spaces(),
    queryFn: () => apiClient.get<KbSpace[]>("/kb/spaces"),
    staleTime: 60_000,
  });
}

export function useKbSpace(spaceId: number) {
  return useQuery({
    queryKey: queryKeys.kb.space(spaceId),
    queryFn: () => apiClient.get<KbSpace>(`/kb/spaces/${spaceId}`),
    enabled: Number.isFinite(spaceId) && spaceId > 0,
    staleTime: 60_000,
  });
}

export function useCreateKbSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSpaceInput) => apiClient.post<KbSpace>("/kb/spaces", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaces() });
    },
  });
}

export function useUpdateKbSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ spaceId, ...data }: UpdateSpaceInput) =>
      apiClient.patch<KbSpace>(`/kb/spaces/${spaceId}`, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaces() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.space(variables.spaceId) });
    },
  });
}

export function useDeleteKbSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (spaceId: number) => apiClient.delete<{ success: boolean }>(`/kb/spaces/${spaceId}`),
    onSuccess: (_data, spaceId) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaces() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.space(spaceId) });
    },
  });
}
