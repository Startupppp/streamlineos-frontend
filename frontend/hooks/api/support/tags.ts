"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface SupportTag {
  id: number;
  orgId: string;
  name: string;
  color: string | null;
  createdAt: string | null;
}

interface CreateTagInput {
  name: string;
  color?: string;
}

export function useSupportTags() {
  return useQuery({
    queryKey: queryKeys.supportTags.list(),
    queryFn: () => apiClient.get<SupportTag[]>("/support/tags"),
    staleTime: 60_000,
  });
}

export function useTicketTags(ticketId: number) {
  return useQuery({
    queryKey: [...queryKeys.support.detail(ticketId), "tags"] as const,
    queryFn: () => apiClient.get<SupportTag[]>(`/support/${ticketId}/tags`),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateTagInput) => apiClient.post<SupportTag>("/support/tags", input),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.supportTags.all }),
  });
}

export function useAttachTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, tagId }: { ticketId: number; tagId: number }) =>
      apiClient.post<{ success: boolean }>(`/support/${ticketId}/tags/${tagId}`, {}),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.support.detail(vars.ticketId) }),
  });
}

export function useDetachTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ticketId, tagId }: { ticketId: number; tagId: number }) =>
      apiClient.delete<{ success: boolean }>(`/support/${ticketId}/tags/${tagId}`),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: queryKeys.support.detail(vars.ticketId) }),
  });
}
