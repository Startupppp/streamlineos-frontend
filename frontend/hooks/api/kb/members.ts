"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useCan } from "@/hooks/api/access";
import type { KbSpaceMember, KbSpaceMemberRow, AddKbSpaceMemberInput } from "@/types/kb";

export function useKbSpaceMembers(spaceId: number) {
  const canManageSpaces = useCan("kb:spaces:manage");
  return useQuery({
    queryKey: queryKeys.kb.spaceMembers(spaceId),
    queryFn: () => apiClient.get<KbSpaceMember[]>(`/kb/spaces/${spaceId}/members`),
    enabled: canManageSpaces && Number.isFinite(spaceId) && spaceId > 0,
    staleTime: 60_000,
  });
}

export function useAddKbSpaceMember(spaceId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: AddKbSpaceMemberInput) =>
      apiClient.post<KbSpaceMemberRow>(`/kb/spaces/${spaceId}/members`, input),
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
