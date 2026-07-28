"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { KbSpace, CreateSpaceInput, UpdateSpaceInput } from "@/types/kb";

export function useKbSpaces() {
  const canView = useCan("kb:spaces:view");
  return useQuery({
    queryKey: queryKeys.kb.spaces(),
    queryFn: () => apiClient.get<KbSpace[]>("/kb/spaces"),
    staleTime: 60_000,
    enabled: canView,
  });
}

export function useKbSpace(spaceId: number) {
  const canView = useCan("kb:spaces:view");
  return useQuery({
    queryKey: queryKeys.kb.space(spaceId),
    queryFn: () => apiClient.get<KbSpace>(`/kb/spaces/${spaceId}`),
    enabled: canView && Number.isFinite(spaceId) && spaceId > 0,
    staleTime: 60_000,
  });
}

export function useCreateKbSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "spaces", "create"],
    mutationFn: (input: CreateSpaceInput) =>
      apiClient.post<KbSpace>("/kb/spaces", input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaces() });
    },
  });
}

export function useUpdateKbSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "spaces", "update"],
    mutationFn: ({ spaceId, ...data }: UpdateSpaceInput) =>
      apiClient.patch<KbSpace>(`/kb/spaces/${spaceId}`, data),
    onSuccess: (_, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaces() });
      qc.invalidateQueries({ queryKey: queryKeys.kb.space(variables.spaceId) });
    },
  });
}

export function useDeleteKbSpace() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["kb", "spaces", "delete"],
    mutationFn: (spaceId: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/spaces/${spaceId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaces() });
    },
  });
}
