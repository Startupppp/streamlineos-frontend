"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { queryKeys } from "@/lib/query-keys";

export interface SupportTicketWatcher {
  id: number;
  orgId: string;
  ticketId: number;
  userId: string;
  createdAt: string | null;
  user: { id: string; name: string | null; image: string | null } | null;
}

export function useSupportWatchers(ticketId: number) {
  return useQuery({
    queryKey: queryKeys.supportWatchers.list(ticketId),
    queryFn: () => apiClient.get<SupportTicketWatcher[]>(`/support/${ticketId}/watchers`),
    enabled: Number.isFinite(ticketId) && ticketId > 0,
    staleTime: 30_000,
  });
}

export function useFollowTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["follow", "ticket"],
    mutationFn: (ticketId: number) => apiClient.post<{ success: boolean }>(`/support/${ticketId}/follow`, {}),
    onSuccess: (_, ticketId) =>
      qc.invalidateQueries({ queryKey: queryKeys.supportWatchers.list(ticketId) }),
  });
}

export function useUnfollowTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["unfollow", "ticket"],
    mutationFn: (ticketId: number) => apiClient.delete<{ success: boolean }>(`/support/${ticketId}/follow`),
    onSuccess: (_, ticketId) =>
      qc.invalidateQueries({ queryKey: queryKeys.supportWatchers.list(ticketId) }),
  });
}
