"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";
import { useAuthorizedMutation } from "@/hooks/api/authorized-mutation";
import { useGatedQuery } from "@/hooks/api/gated-query";

export interface SupportTag {
  id: number;
  orgId: string;
  name: string;
  color: string | null;
  createdAt: string | null;
}

export function useSupportTags() {
  return useGatedQuery("support:tickets:view", {
    queryKey: queryKeys.supportTags.list(),
    queryFn: ({ signal }) => apiClient.get<SupportTag[]>("/support/tags", undefined, signal),
    staleTime: 60_000,
  });
}

export function useTicketTags(ticketId: number) {
  return useGatedQuery("support:tickets:view", {
    queryKey: [...queryKeys.support.detail(ticketId), "tags"] as const,
    queryFn: ({ signal }) => apiClient.get<SupportTag[]>(`/support/${ticketId}/tags`, undefined, signal),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useAttachTag() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["attach", "tag"],
    mutationFn: ({ ticketId, tagId }: { ticketId: number; tagId: number }) =>
      apiClient.post<{ success: boolean }>(`/support/${ticketId}/tags/${tagId}`, {}),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: queryKeys.support.detail(vars.ticketId) }),
  });
}

export function useDetachTag() {
  const qc = useQueryClient();
  return useAuthorizedMutation("support:tickets:manage", {
    mutationKey: ["detach", "tag"],
    mutationFn: ({ ticketId, tagId }: { ticketId: number; tagId: number }) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/tags/${tagId}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: queryKeys.support.detail(vars.ticketId) }),
  });
}
