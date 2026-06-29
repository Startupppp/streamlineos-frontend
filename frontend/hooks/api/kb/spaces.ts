"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { KbSpace, CreateSpaceInput } from "@/types/kb";

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
