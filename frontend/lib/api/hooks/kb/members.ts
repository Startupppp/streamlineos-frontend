"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import type { KbSpaceMember, AddKbSpaceMemberInput } from "@/types/kb";

export function useKbSpaceMembers(spaceId: number) {
  return useQuery({
    queryKey: queryKeys.kb.spaceMembers(spaceId),
    queryFn: () => apiClient.get<KbSpaceMember[]>(`/kb/spaces/${spaceId}/members`),
    enabled: Number.isFinite(spaceId) && spaceId > 0,
    staleTime: 60_000,
  });
}

export function useAddKbSpaceMember(spaceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddKbSpaceMemberInput) =>
      apiClient.post<KbSpaceMember>(`/kb/spaces/${spaceId}/members`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaceMembers(spaceId) });
    },
  });
}

export function useRemoveKbSpaceMember(spaceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: number) =>
      apiClient.delete<{ success: boolean }>(`/kb/spaces/${spaceId}/members/${memberId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.kb.spaceMembers(spaceId) });
    },
  });
}
